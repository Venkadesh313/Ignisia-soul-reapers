const { getWindowMetrics } = require('./metricsService');
const pool = require('../config/db');

/**
 * Main AI Pattern Detection Logic using baseline + deviation thresholds.
 * Simple, robust, lightweight.
 */
async function detectPatterns() {
  try {
    // Current window: Last 5 minutes
    const currentWindow = await getWindowMetrics(5, 0);
    // Baseline window: Previous 60 minutes (offset by 5 mins)
    const baselineWindow = await getWindowMetrics(60, 5);

    const insights = [];

    // Rule 1: Failure Spike
    // Condition: Failure rate is > 2x baseline, and we have enough transactions in current window
    if (currentWindow.totalTransactions > 5 && currentWindow.failureRate > (baselineWindow.failureRate * 2) && currentWindow.failureRate > 0.1) {
      insights.push({
        type: 'failure_spike',
        severity: 'high',
        message: 'Sudden spike in failure rate detected across recent transactions.',
        current_value: currentWindow.failureRate,
        baseline_value: baselineWindow.failureRate
      });
    }

    // Rule 2: Retry Storm
    // Condition: Duplicate rate is > 3x baseline or simply > 50%
    if (currentWindow.totalTransactions > 5 && (currentWindow.duplicateRate > (baselineWindow.duplicateRate * 3) || currentWindow.duplicateRate > 0.5)) {
      insights.push({
        type: 'retry_storm',
        severity: 'high',
        message: 'Duplicate webhook burst indicates a possible downstream retry storm.',
        current_value: currentWindow.duplicateRate,
        baseline_value: baselineWindow.duplicateRate
      });
    }

    // Rule 3: Refund Spike
    if (currentWindow.totalTransactions > 5 && currentWindow.refundRate > (baselineWindow.refundRate * 2) && currentWindow.refundRate > 0.05) {
      insights.push({
        type: 'refund_anomaly',
        severity: 'medium',
        message: 'Abnormal increase in refund events.',
        current_value: currentWindow.refundRate,
        baseline_value: baselineWindow.refundRate
      });
    }

    // Rule 4: System Settlement Delay (High stuck instances)
    // 5 stuck in 5 mins vs normal baseline
    if (currentWindow.stuckCount > (baselineWindow.stuckCount / 12) * 2 && currentWindow.stuckCount > 3) {
      insights.push({
        type: 'settlement_delay',
        severity: 'medium',
        message: 'Abnormal count of transactions stuck in pending/unresolved states.',
        current_value: currentWindow.stuckCount,
        baseline_value: (baselineWindow.stuckCount / 12) // average stuck per 5 mins in baseline
      });
    }

    // Save generated insights to DB
    for (const insight of insights) {
      await pool.query(
        `INSERT INTO pattern_insights (type, severity, message, current_value, baseline_value) 
         VALUES ($1, $2, $3, $4, $5)`,
        [insight.type, insight.severity, insight.message, insight.current_value, insight.baseline_value]
      );
    }

    if (insights.length > 0) {
      console.log(`[patternDetector] Generated ${insights.length} AI insights.`);
    }
  } catch (error) {
    console.error('[patternDetector] Error running pattern suite:', error);
  }
}

module.exports = { detectPatterns };
