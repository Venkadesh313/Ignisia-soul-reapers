const pool = require('../config/db');

const UPSERT_SQL = `
  INSERT INTO transaction_status (transaction_id, status, gap_details, updated_at)
  VALUES ($1, $2, $3, NOW())
  ON CONFLICT (transaction_id) DO UPDATE SET
    status     = EXCLUDED.status,
    gap_details = EXCLUDED.gap_details,
    updated_at = NOW()
`;

/**
 * @param {string} transactionId
 */
async function markClean(transactionId) {
  try {
    await pool.query(UPSERT_SQL, [transactionId, 'CLEAN', null]);
  } catch (err) {
    throw new Error(`markClean failed: ${err.message}`);
  }
}

/**
 * @param {string} transactionId
 * @param {object[]} gaps - anomaly details array
 */
async function markAnomaly(transactionId, gaps) {
  try {
    await pool.query(UPSERT_SQL, [transactionId, 'ANOMALY', JSON.stringify(gaps)]);
  } catch (err) {
    throw new Error(`markAnomaly failed: ${err.message}`);
  }
}

/**
 * @param {string} transactionId
 */
async function markPending(transactionId) {
  try {
    await pool.query(UPSERT_SQL, [transactionId, 'PENDING', null]);
  } catch (err) {
    throw new Error(`markPending failed: ${err.message}`);
  }
}

module.exports = { markClean, markAnomaly, markPending };
