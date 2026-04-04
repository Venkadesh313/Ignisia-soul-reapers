const { getEventsByTransactionId } = require('../repositories/eventRepository');
const { markClean, markAnomaly, markPending } = require('../repositories/statusRepository');
const { normalizeEvents } = require('../utils/normalizeEvent');
const { runStateMachine } = require('./stateMachineService');
const { detectAnomalies } = require('./anomalyService');

/**
 * Orchestrates the full reconciliation pipeline for a transaction.
 * No heal logic lives here — healing is triggered by checkController.
 * @param {string} transactionId
 * @returns {Promise<{status: string, gaps?: object[]}>}
 */
async function processTransaction(transactionId) {
  try {
    const rawEvents = await getEventsByTransactionId(transactionId);
    const eventTypes = normalizeEvents(rawEvents);
    const machineResult = runStateMachine(eventTypes);

    if (machineResult.status === 'CLEAN') {
      await markClean(transactionId);
      return { status: 'CLEAN' };
    }

    if (machineResult.status === 'PENDING') {
      await markPending(transactionId);
      return { status: 'PENDING' };
    }

    // ANOMALY path — detect gaps and persist, no heal call
    const gaps = detectAnomalies(eventTypes);
    await markAnomaly(transactionId, gaps);
    return { status: 'ANOMALY', gaps };
  } catch (err) {
    throw new Error(`processTransaction failed: ${err.message}`);
  }
}

module.exports = { processTransaction };
