// services/aiDetection.js
// AI-style pattern detection for webhook anomalies.
// Computes dynamic baselines from recent DB events and flags statistically
// significant deviations in failure rate, refund rate, duplicates, and timing.

const supabase = require('../supabaseClient');

// ─── Config ───────────────────────────────────────────────────────────────────

const BASELINE_WINDOW = 100;    // Number of recent events used to build baseline
const ANOMALY_THRESHOLD = 1.5;  // Current metric must be > baseline × this to flag anomaly

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fetches the last N events from the DB to compute a dynamic baseline.
 * @param {number} limit
 * @returns {Array} event records
 */
const fetchRecentEvents = async (limit = BASELINE_WINDOW) => {
  const { data, error } = await supabase
    .from('events')
    .select('event_type, txn_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`[AI_DETECTION] Failed to fetch baseline events: ${error.message}`);
  }
  return data || [];
};

/**
 * Computes baseline metrics from a list of event records.
 * @param {Array} events
 * @returns {object} baseline metrics
 */
const computeBaseline = (events) => {
  if (!events || events.length === 0) {
    return { failure_rate: 0, refund_rate: 0, avg_delay_ms: 0, duplicate_rate: 0 };
  }

  const total = events.length;
  const failures = events.filter((e) => e.event_type === 'failure').length;
  const refunds  = events.filter((e) => e.event_type === 'refund').length;

  // Detect duplicates: same txn_id + event_type appearing more than once
  const seen = new Map();
  let duplicates = 0;
  for (const e of events) {
    const key = `${e.txn_id}:${e.event_type}`;
    seen.set(key, (seen.get(key) || 0) + 1);
    if (seen.get(key) === 2) duplicates++; // Count first time duplicate occurs
  }

  // Compute average time delay between consecutive events (ms)
  const sorted = [...events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  let totalDelay = 0;
  let delayCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff = new Date(sorted[i].created_at) - new Date(sorted[i - 1].created_at);
    if (diff >= 0) { totalDelay += diff; delayCount++; }
  }
  const avg_delay_ms = delayCount > 0 ? totalDelay / delayCount : 0;

  return {
    failure_rate:   total > 0 ? failures  / total : 0,
    refund_rate:    total > 0 ? refunds   / total : 0,
    duplicate_rate: total > 0 ? duplicates / total : 0,
    avg_delay_ms,
    total,
  };
};

/**
 * Computes metrics for the current transaction being evaluated.
 * @param {object} transactionData - { txn_id, events: [...], receiveTime }
 * @returns {object} current metrics
 */
const computeCurrentMetrics = (transactionData) => {
  const { events = [], receiveTime } = transactionData;
  const total = events.length;

  const failures  = events.filter((e) => e.event_type === 'failure').length;
  const refunds   = events.filter((e) => e.event_type === 'refund').length;

  // Check for duplicates within this transaction's events
  const seen = new Map();
  let duplicates = 0;
  for (const e of events) {
    const key = e.event_type;
    seen.set(key, (seen.get(key) || 0) + 1);
    if (seen.get(key) === 2) duplicates++;
  }

  // Time delay: from first event created_at to now (or last event)
  let delay_ms = 0;
  if (events.length > 0) {
    const sorted = [...events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const start = new Date(sorted[0].created_at);
    const end   = receiveTime ? new Date(receiveTime) : new Date(sorted[sorted.length - 1].created_at);
    delay_ms = Math.max(0, end - start);
  }

  return {
    failure_rate:   total > 0 ? failures  / total : 0,
    refund_rate:    total > 0 ? refunds   / total : 0,
    duplicate_rate: total > 0 ? duplicates / total : 0,
    delay_ms,
    total,
  };
};

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Detects pattern-level anomalies by comparing current transaction metrics
 * against a dynamically computed baseline from recent DB events.
 *
 * @param {object} transactionData - { txn_id, events: Array, receiveTime: ISO string }
 * @returns {object} { isAnomaly: boolean, reason: string|null, metrics: object, baseline: object }
 */
const detectPatternAnomaly = async (transactionData) => {
  let baseline;
  try {
    const recentEvents = await fetchRecentEvents(BASELINE_WINDOW);
    baseline = computeBaseline(recentEvents);
  } catch (err) {
    console.warn('[AI_DETECTION] Could not fetch baseline — using zero baseline:', err.message);
    baseline = { failure_rate: 0, refund_rate: 0, duplicate_rate: 0, avg_delay_ms: 0, total: 0 };
  }

  const current = computeCurrentMetrics(transactionData);

  console.log(`[AI_DETECTION] txn_id="${transactionData.txn_id}" | current:`, current, '| baseline:', baseline);

  // Compare each metric against baseline × threshold
  // Only trigger if baseline is non-zero (avoid false positives on empty DB)
  const reasons = [];

  if (baseline.failure_rate > 0 && current.failure_rate > baseline.failure_rate * ANOMALY_THRESHOLD) {
    reasons.push('HIGH_FAILURE_RATE');
  }
  if (baseline.refund_rate > 0 && current.refund_rate > baseline.refund_rate * ANOMALY_THRESHOLD) {
    reasons.push('HIGH_REFUND_RATE');
  }
  if (baseline.duplicate_rate > 0 && current.duplicate_rate > baseline.duplicate_rate * ANOMALY_THRESHOLD) {
    reasons.push('HIGH_DUPLICATE_RATE');
  }
  if (baseline.avg_delay_ms > 0 && current.delay_ms > baseline.avg_delay_ms * ANOMALY_THRESHOLD) {
    reasons.push('SLOW_EVENT_DELAY');
  }

  const isAnomaly = reasons.length > 0;

  return {
    isAnomaly,
    reason: isAnomaly ? reasons[0] : null,  // Primary reason (first detected)
    allReasons: reasons,
    metrics: current,
    baseline,
  };
};

module.exports = { detectPatternAnomaly };
