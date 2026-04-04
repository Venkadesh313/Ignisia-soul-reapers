const pool = require('../config/db');

/**
 * Fetch all webhook events for a transaction ordered by lifecycle position,
 * then received_at — ensures healed events land in the correct slot regardless
 * of their sequence_no or insertion time.
 * @param {string} transactionId
 * @returns {Promise<Array<{event_type: string, sequence_no: number, received_at: Date}>>}
 */
async function getEventsByTransactionId(transactionId) {
  try {
    const result = await pool.query(
      `SELECT event_type, sequence_no, received_at
       FROM webhook_events
       WHERE transaction_id = $1
       ORDER BY
         CASE event_type
           WHEN 'created'  THEN 1
           WHEN 'captured' THEN 2
           WHEN 'settled'  THEN 3
           WHEN 'refunded' THEN 3
           WHEN 'failed'   THEN 2
         END ASC,
         received_at ASC`,
      [transactionId]
    );
    return result.rows;
  } catch (err) {
    throw new Error(`getEventsByTransactionId failed: ${err.message}`);
  }
}

module.exports = { getEventsByTransactionId };
