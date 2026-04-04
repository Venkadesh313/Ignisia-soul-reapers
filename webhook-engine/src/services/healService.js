/**
 * Heal Service
 * Reconstructs missing events from the mock gateway and verifies
 * the result directly via the state machine — no processTransaction call,
 * no circular dependency.
 */

const pool = require('../config/db');
const { getMockTransactionHistory } = require('./mockGatewayService');
const { runStateMachine } = require('./stateMachineService');
const logger = require('../utils/logger');

/**
 * @param {string} transactionId
 * @param {Array<{type: string, detail: string, missingEvent?: string}>} gaps
 * @returns {Promise<{healed: boolean, reason?: string}>}
 */
async function healTransaction(transactionId, gaps) {
  try {
    logger.info(`[healService] Healing started for transaction: ${transactionId}`);

    // Fetch history from mock gateway
    const gatewayResult = await getMockTransactionHistory(transactionId);

    // Gateway returned nothing
    if (!gatewayResult.found) {
      await pool.query(
        `INSERT INTO anomalies (transaction_id, anomaly_type, detail, action, created_at)
         VALUES ($1, 'UNRESOLVABLE', 'Gateway returned no history', 'MANUAL_REVIEW', NOW())`,
        [transactionId]
      );
      await pool.query(
        `INSERT INTO transaction_status (transaction_id, status, updated_at)
         VALUES ($1, 'UNRESOLVABLE', NOW())
         ON CONFLICT (transaction_id) DO UPDATE SET
           status = 'UNRESOLVABLE', updated_at = NOW()`,
        [transactionId]
      );
      return { healed: false, reason: 'Not found in gateway' };
    }

    // Extract missing event types from gaps
    const missingEvents = (gaps || [])
      .filter(g => g.type === 'MISSING')
      .map(g => g.missingEvent)
      .filter(Boolean);

    // Insert each missing event that exists in gateway history
    for (const missingEvent of missingEvents) {
      if (gatewayResult.events.includes(missingEvent)) {
        await pool.query(
          `INSERT INTO webhook_events (transaction_id, event_type, sequence_no, idempotency_key)
           VALUES (
             $1,
             $2,
             (SELECT COALESCE(MAX(sequence_no), 0) + 1 FROM webhook_events WHERE transaction_id = $1),
             $3
           )
           ON CONFLICT (idempotency_key) DO NOTHING`,
          [transactionId, missingEvent, `healed_${transactionId}_${missingEvent}`]
        );
        logger.info(`[healService] Inserted missing event '${missingEvent}' for ${transactionId}`);
      }
    }

    // Verify using lifecycle-ordered query — bypasses sequence_no ordering issues
    const verifyResult = await pool.query(
      `SELECT event_type FROM webhook_events
       WHERE transaction_id = $1
       ORDER BY
         CASE event_type
           WHEN 'created'  THEN 1
           WHEN 'captured' THEN 2
           WHEN 'settled'  THEN 3
           WHEN 'refunded' THEN 3
           WHEN 'failed'   THEN 2
         END ASC`,
      [transactionId]
    );
    const orderedTypes = verifyResult.rows.map(r => r.event_type);
    const verification = runStateMachine(orderedTypes);

    if (verification.status === 'CLEAN') {
      await pool.query(
        `INSERT INTO transaction_status (transaction_id, status, updated_at)
         VALUES ($1, 'RESOLVED', NOW())
         ON CONFLICT (transaction_id) DO UPDATE SET
           status     = 'RESOLVED',
           gap_details = NULL,
           updated_at = NOW()`,
        [transactionId]
      );
      logger.info(`[healService] Transaction ${transactionId} resolved successfully`);
      return { healed: true };
    }

    // Still not clean after heal attempt
    await pool.query(
      `INSERT INTO anomalies (transaction_id, anomaly_type, detail, action, created_at)
       VALUES ($1, 'UNRESOLVABLE', 'Auto-heal attempted but failed', 'MANUAL_REVIEW', NOW())`,
      [transactionId]
    );
    await pool.query(
      `INSERT INTO transaction_status (transaction_id, status, updated_at)
       VALUES ($1, 'UNRESOLVABLE', NOW())
       ON CONFLICT (transaction_id) DO UPDATE SET
         status = 'UNRESOLVABLE', updated_at = NOW()`,
      [transactionId]
    );

    logger.warn(`[healService] Could not resolve transaction ${transactionId}`);
    return { healed: false, reason: 'Could not resolve' };
  } catch (err) {
    throw new Error(`healTransaction failed: ${err.message}`);
  }
}

module.exports = { healTransaction };
