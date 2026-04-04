/**
 * Replay Detection Service
 * Distinguishes innocent retries from malicious replay attacks
 * using a scored heuristic model.
 */

const pool = require('../config/db');
const logger = require('../utils/logger');

// Track last duplicate time per eventId (in-memory)
const recentDuplicates = {};

/**
 * Score and classify a duplicate webhook event.
 * @param {string} eventId - idempotency key
 * @param {{ transaction_id: string, event_type: string }} incomingEvent
 * @param {number} originalTimestamp - ms epoch when first seen
 * @returns {Promise<{action: 'BLOCK'|'DROP', fraudScore: number}>}
 */
async function analyzeReplay(eventId, incomingEvent, originalTimestamp) {
  try {
    const { transaction_id, event_type } = incomingEvent;
    const now = Date.now();
    const timeDelta = now - originalTimestamp;
    const currentHour = new Date().getHours();

    let score = 0;

    // +0.4 — Suspiciously fast from original (within 5 seconds)
    if (timeDelta < 5000) score += 0.4;

    // +0.4 — Rapid repeat duplicate (fast after previous duplicate)
    if (recentDuplicates[eventId]) {
      const timeSinceLastDuplicate = now - recentDuplicates[eventId];
      if (timeSinceLastDuplicate < 5000) score += 0.4;
    }

    // Update last duplicate timestamp for this eventId
    recentDuplicates[eventId] = now;

    // +0.3 — High-value target event
    if (event_type === 'refunded') score += 0.3;

    // +0.2 — Delayed replay attempt (> 1 hour gap from original)
    if (timeDelta > 3_600_000) score += 0.2;

    // +0.1 — Off-hours attack pattern (1am–5am)
    if (currentHour >= 1 && currentHour < 5) score += 0.1;

    // Cap at 1.0
    score = Math.min(parseFloat(score.toFixed(2)), 1.0);

    const action = score >= 0.7 ? 'BLOCK' : 'DROP';

    if (action === 'BLOCK') {
      await pool.query(
        `INSERT INTO anomalies (transaction_id, anomaly_type, detail, fraud_score, action, created_at)
         VALUES ($1, 'REPLAY_ATTACK', 'Suspicious duplicate webhook detected', $2, 'BLOCKED', NOW())`,
        [transaction_id, score]
      );
      logger.warn(`[replayDetection] BLOCK — txn=${transaction_id} score=${score}`);
      return { action: 'BLOCK', fraudScore: score };
    }

    // DROP — harmless retry
    await pool.query(
      `INSERT INTO anomalies (transaction_id, anomaly_type, detail, fraud_score, action, created_at)
       VALUES ($1, 'HARMLESS_RETRY', 'Innocent duplicate detected', $2, 'DROPPED', NOW())`,
      [transaction_id, score]
    );
    logger.info(`[replayDetection] DROP — txn=${transaction_id} score=${score}`);
    return { action: 'DROP', fraudScore: score };

  } catch (err) {
    throw new Error(`analyzeReplay failed: ${err.message}`);
  }
}

// Cleanup old entries from recentDuplicates every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 600_000; // 10 minutes
  for (const key in recentDuplicates) {
    if (recentDuplicates[key] < cutoff) {
      delete recentDuplicates[key];
    }
  }
}, 600_000);

module.exports = { analyzeReplay };