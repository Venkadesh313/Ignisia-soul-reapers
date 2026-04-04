const pool   = require('../config/db');
const logger = require('../utils/logger');

/**
 * POST /review/resolve
 * Body: { transaction_id: string, decision: 'SAFE' | 'FRAUD' }
 */
async function resolveReview(req, res) {
  try {
    const { transaction_id, decision } = req.body;

    if (!transaction_id || !decision) {
      return res.status(400).json({ error: 'transaction_id and decision are required' });
    }

    if (decision === 'SAFE') {
      await pool.query(
        `UPDATE transaction_status
         SET status = 'MANUALLY_RESOLVED', updated_at = NOW()
         WHERE transaction_id = $1`,
        [transaction_id]
      );
      await pool.query(
        `INSERT INTO anomalies (transaction_id, anomaly_type, detail, action, created_at)
         VALUES ($1, 'MANUAL_REVIEW', 'Marked safe by human reviewer', 'RESOLVED', NOW())`,
        [transaction_id]
      );
    } else if (decision === 'FRAUD') {
      await pool.query(
        `UPDATE transaction_status
         SET status = 'FRAUD_CONFIRMED', updated_at = NOW()
         WHERE transaction_id = $1`,
        [transaction_id]
      );
      await pool.query(
        `INSERT INTO anomalies (transaction_id, anomaly_type, detail, action, created_at)
         VALUES ($1, 'CONFIRMED_FRAUD', 'Confirmed as fraud by human reviewer', 'FRAUD_CONFIRMED', NOW())`,
        [transaction_id]
      );
    } else {
      return res.status(400).json({ error: 'decision must be SAFE or FRAUD' });
    }

    const newStatus = decision === 'SAFE' ? 'MANUALLY_RESOLVED' : 'FRAUD_CONFIRMED';
    logger.info(`[reviewController] ${transaction_id} → ${newStatus}`);

    return res.status(200).json({ success: true, transaction_id, decision, newStatus });
  } catch (err) {
    logger.error('resolveReview error', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { resolveReview };
