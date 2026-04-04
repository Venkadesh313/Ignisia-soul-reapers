const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { getPatternFlags } = require('../services/patternDetectionService');
const { getAvgResponseTime, getDynamicLimit, inMemoryQueue } = require('../middleware/rateLimiter');
const logger  = require('../utils/logger');

// GET /patterns/flags — in-memory behavioral anomaly flags
router.get('/flags', (req, res) => {
  try {
    return res.status(200).json({ flags: getPatternFlags() });
  } catch (err) {
    logger.error('/patterns/flags error', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /patterns/security — recent replay / retry anomalies from DB
router.get('/security', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM anomalies
       WHERE anomaly_type IN ('REPLAY_ATTACK', 'HARMLESS_RETRY')
       ORDER BY created_at DESC
       LIMIT 20`
    );
    return res.status(200).json({ anomalies: result.rows });
  } catch (err) {
    logger.error('/patterns/security error', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /patterns/metrics — reconciliation health metrics
router.get('/metrics', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*)                                                              AS total,
         COUNT(*) FILTER (WHERE status = 'CLEAN')                             AS clean,
         COUNT(*) FILTER (WHERE status = 'ANOMALY')                           AS anomaly,
         COUNT(*) FILTER (WHERE status = 'RESOLVED'
                              OR status = 'MANUALLY_RESOLVED')                AS resolved,
         COUNT(*) FILTER (WHERE status = 'UNRESOLVABLE')                      AS unresolvable,
         COUNT(*) FILTER (WHERE status = 'PENDING')                           AS pending,
         COUNT(*) FILTER (WHERE status = 'FRAUD_CONFIRMED')                   AS fraud_confirmed
       FROM transaction_status`
    );

    const row            = result.rows[0];
    const total          = parseInt(row.total)          || 1; // avoid div/0
    const anomalyCount   = parseInt(row.anomaly)        || 0;
    const resolvedCount  = parseInt(row.resolved)       || 0;

    const driftRate      = ((anomalyCount / total) * 100).toFixed(2);
    const healSuccessRate = anomalyCount > 0
      ? ((resolvedCount / anomalyCount) * 100).toFixed(2)
      : '100.00';

    return res.status(200).json({
      total:          parseInt(row.total)          || 0,
      clean:          parseInt(row.clean)          || 0,
      anomaly:        anomalyCount,
      resolved:       resolvedCount,
      unresolvable:   parseInt(row.unresolvable)   || 0,
      pending:        parseInt(row.pending)        || 0,
      fraudConfirmed: parseInt(row.fraud_confirmed)|| 0,
      driftRate,
      healSuccessRate,
    });
  } catch (err) {
    logger.error('/patterns/metrics error', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /patterns/surge — real-time rate limiter and queue health
router.get('/surge', (req, res) => {
  try {
    const avgResponseTime = getAvgResponseTime();
    const currentLimit    = getDynamicLimit();
    const queueDepth      = inMemoryQueue.length;
    const status          = avgResponseTime < 50  ? 'HEALTHY'
                          : avgResponseTime < 150 ? 'DEGRADED'
                          : 'CRITICAL';

    return res.status(200).json({
      avgResponseTime: Math.round(avgResponseTime),
      currentLimit,
      queueDepth,
      status,
      thresholds: {
        healthy:  '< 50ms → 200 req/s',
        degraded: '50-150ms → 100 req/s',
        critical: '> 150ms → 30 req/s',
      },
    });
  } catch (err) {
    logger.error('/patterns/surge error', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
