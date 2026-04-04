/**
 * Pattern Detection Service
 * Detects system-wide behavioral anomalies across ALL transactions
 * using in-memory sliding windows. No DB tables required.
 */

const logger = require('../utils/logger');

const MAX_WINDOW = 100;
const FLAG_TTL_MS = 60 * 60 * 1000; // 1 hour

const recentEvents = [];   // { transactionId, eventType, timestamp }
const patternFlags = [];   // { type, detail, severity, timestamp, ...extra }
const timingMap = {};      // transactionId → { createdAt, capturedAt }
const duplicateAttempts = { count: 0, total: 0 }; // rolling duplicate tracker

/**
 * Record an incoming event and trigger pattern analysis.
 * @param {string} transactionId
 * @param {string} eventType
 */
function recordEvent(transactionId, eventType) {
  try {
    const now = Date.now();
    recentEvents.push({ transactionId, eventType, timestamp: now });

    // Keep only last MAX_WINDOW entries
    if (recentEvents.length > MAX_WINDOW) {
      recentEvents.splice(0, recentEvents.length - MAX_WINDOW);
    }

    // Track timing for delay anomaly detection
    if (eventType === 'created') {
      timingMap[transactionId] = { createdAt: now };
    } else if (eventType === 'captured' && timingMap[transactionId]) {
      timingMap[transactionId].capturedAt = now;
    }

    analyzePatterns();
  } catch (err) {
    logger.error('[patternDetection] recordEvent error', err.message);
  }
}

/**
 * Analyze recent events for anomaly patterns and push flags.
 */
function analyzePatterns() {
  try {
    clearOldFlags();

    const baseline = recentEvents.slice(-MAX_WINDOW);
    const current  = recentEvents.slice(-10);

    if (baseline.length === 0) return;

    // ── Failure rate ──────────────────────────────────────────
    const baselineFailureRate = baseline.filter(e => e.eventType === 'failed').length / baseline.length;
    const currentFailureRate  = current.length
      ? current.filter(e => e.eventType === 'failed').length / current.length
      : 0;

    if (currentFailureRate > baselineFailureRate * 2 && currentFailureRate > 0.3) {
      _pushFlag({
        type: 'FAILURE_SPIKE',
        detail: 'Abnormal failure rate detected',
        baseline: baselineFailureRate,
        current: currentFailureRate,
        severity: 'HIGH'
      });
    }

    // ── Duplicate / retry storm ───────────────────────────────
    const duplicateRate = duplicateAttempts.total > 0
      ? duplicateAttempts.count / duplicateAttempts.total
      : 0;

    if (duplicateRate > 0.5) {
      _pushFlag({
        type: 'RETRY_STORM',
        detail: 'Too many duplicate webhooks',
        duplicateRate,
        severity: 'HIGH'
      });
    }

    // ── Delay anomaly ─────────────────────────────────────────
    const completedTimings = Object.values(timingMap)
      .filter(t => t.createdAt && t.capturedAt)
      .slice(-50);

    if (completedTimings.length > 1) {
      const avgDelay = completedTimings.reduce((sum, t) => sum + (t.capturedAt - t.createdAt), 0)
        / completedTimings.length;

      const lastEntry = completedTimings[completedTimings.length - 1];
      const lastDelay = lastEntry.capturedAt - lastEntry.createdAt;

      if (lastDelay > avgDelay * 3) {
        _pushFlag({
          type: 'DELAY_ANOMALY',
          detail: 'Unusual delay in lifecycle',
          avgDelayMs: Math.round(avgDelay),
          currentDelayMs: Math.round(lastDelay),
          severity: 'MEDIUM'
        });
      }
    }
  } catch (err) {
    logger.error('[patternDetection] analyzePatterns error', err.message);
  }
}

/**
 * Increment duplicate counter (called by idempotency layer).
 * @param {boolean} wasDuplicate
 */
function trackDuplicate(wasDuplicate) {
  duplicateAttempts.total += 1;
  if (wasDuplicate) duplicateAttempts.count += 1;
  // Reset rolling window every 200 events
  if (duplicateAttempts.total > 200) {
    duplicateAttempts.count = 0;
    duplicateAttempts.total = 0;
  }
}

/** @returns {object[]} Last 20 pattern flags */
function getPatternFlags() {
  return patternFlags.slice(-20);
}

/** Remove flags older than 1 hour */
function clearOldFlags() {
  const cutoff = Date.now() - FLAG_TTL_MS;
  const stale = patternFlags.findIndex(f => f.timestamp >= cutoff);
  if (stale > 0) patternFlags.splice(0, stale);
}

function _pushFlag(flag) {
  patternFlags.push({ ...flag, timestamp: Date.now() });
}

module.exports = { recordEvent, getPatternFlags, analyzePatterns, trackDuplicate };
