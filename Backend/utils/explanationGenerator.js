// utils/explanationGenerator.js
// Provides human-readable, LLM-style explanations for detected anomaly types.
// Acts as a simple rule-based "explainability" layer without requiring an external AI API.

/**
 * Maps a known anomaly type string to a human-readable explanation message.
 *
 * @param {string} anomalyType - One of the known anomaly type keys.
 * @returns {string} A plain-English explanation suitable for storing in the DB or surfacing to users.
 */
const generateExplanation = (anomalyType) => {
  const explanations = {
    OUT_OF_ORDER:
      'An event was received out of the expected transaction lifecycle order. ' +
      'This may indicate a webhook drop, replay attack, or upstream system reordering.',

    MISSING_EVENT:
      'One or more expected events are absent from the transaction sequence. ' +
      'The webhook may have been lost in transit, timed out, or silently dropped by the gateway.',

    HIGH_FAILURE_RATE:
      'The failure rate for this transaction significantly exceeds the recent system baseline. ' +
      'This could indicate a payment processor issue, network instability, or a misconfigured merchant account.',

    HIGH_REFUND_RATE:
      'The refund rate is abnormally high compared to baseline levels. ' +
      'This may signal a fraud pattern, unusual dispute activity, or a product/service quality issue.',

    HIGH_DUPLICATE_RATE:
      'An unusually high number of duplicate events were detected beyond the normal retry rate. ' +
      'This could be a retry storm, misconfigured webhook endpoint, or a bug in the sending system.',

    SLOW_EVENT_DELAY:
      'Events are arriving significantly slower than the baseline average. ' +
      'This may indicate network degradation, queue backlogs, or processing bottlenecks upstream.',

    UNKNOWN:
      'An unclassified anomaly was detected in this transaction. ' +
      'Manual review is recommended to determine the root cause.',
  };

  return explanations[anomalyType] || explanations['UNKNOWN'];
};

module.exports = { generateExplanation };
