const pool = require('../config/db');

/**
 * Aggregates metrics from the database for a specific time window.
 * 
 * @param {number} windowMinutes The length of the window in minutes
 * @param {number} offsetMinutes The offset in minutes from now (e.g., 5 means 5-10 minutes ago)
 */
async function getWindowMetrics(windowMinutes, offsetMinutes = 0) {
  const startInterval = `${windowMinutes + offsetMinutes} minutes`;
  const endInterval = `${offsetMinutes} minutes`;

  const query = `
    SELECT 
      COUNT(*) as total_events,
      COUNT(*) FILTER (WHERE event_type = 'failed') as failure_count,
      COUNT(*) FILTER (WHERE event_type = 'refunded') as refund_count,
      COUNT(*) FILTER (WHERE anomaly_type = 'DUPLICATE_EVENT' OR detail ILIKE '%duplicate%') as duplicate_count
    FROM webhook_events w
    LEFT JOIN anomalies a ON w.transaction_id = a.transaction_id
    WHERE w.received_at >= NOW() - INTERVAL '${startInterval}'
      AND w.received_at < NOW() - INTERVAL '${endInterval}'
  `;

  // We also check transaction_status for stuck transactions
  const stuckQuery = `
    SELECT COUNT(*) as stuck_count
    FROM transaction_status
    WHERE status != 'RESOLVED' 
      AND status != 'HEALED'
      AND updated_at >= NOW() - INTERVAL '${startInterval}'
      AND updated_at < NOW() - INTERVAL '${endInterval}'
  `;

  try {
    const res = await pool.query(query);
    const stuckRes = await pool.query(stuckQuery);
    
    const row = res.rows[0];
    const total = parseInt(row.total_events, 10) || 0;
    
    return {
      totalTransactions: total,
      failureCount: parseInt(row.failure_count, 10) || 0,
      failureRate: total > 0 ? (parseInt(row.failure_count, 10) / total) : 0,
      refundCount: parseInt(row.refund_count, 10) || 0,
      refundRate: total > 0 ? (parseInt(row.refund_count, 10) / total) : 0,
      duplicateCount: parseInt(row.duplicate_count, 10) || 0,
      duplicateRate: total > 0 ? (parseInt(row.duplicate_count, 10) / total) : 0,
      stuckCount: parseInt(stuckRes.rows[0].stuck_count, 10) || 0
    };
  } catch (err) {
    console.error('[metricsService] Error calculating window metrics:', err.message);
    return {
      totalTransactions: 0, failureCount: 0, failureRate: 0, 
      refundCount: 0, refundRate: 0, duplicateCount: 0, duplicateRate: 0, stuckCount: 0
    };
  }
}

module.exports = { getWindowMetrics };
