const pool = require('../config/db');

/**
 * Expose pattern insights to the frontend dashboard
 */
async function getPatternInsights(req, res) {
  try {
    const result = await pool.query(
      `SELECT type, severity, message, current_value as "currentValue", baseline_value as "baselineValue", detected_at as "detectedAt" 
       FROM pattern_insights 
       ORDER BY detected_at DESC 
       LIMIT 10`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[dashboardController] Error fetching insights:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { getPatternInsights };
