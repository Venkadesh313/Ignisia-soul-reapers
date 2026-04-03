const { transactions, anomalies } = require('./mockData');

const correctEvents = ['CREATED', 'CAPTURED', 'SETTLED'];

function manualReviewResponse(id, anomalyType, originalEvents, reason) {
  return {
    transactionId: id,
    anomalyType,
    originalEvents,
    healedEvents: [],
    status: 'MANUAL_REVIEW',
    reason,
  };
}

function healTransaction(id) {
  const brokenTransaction = anomalies.find((item) => item.transactionId === id);

  if (!brokenTransaction) {
    return manualReviewResponse(id, null, [], 'Broken transaction not found');
  }

  const correctTransaction = transactions.find((item) => item.transactionId === 'txn_101');
  const receivedEvents = brokenTransaction.receivedEvents;

  if (!correctTransaction) {
    return manualReviewResponse(brokenTransaction.transactionId, brokenTransaction.anomalyType, receivedEvents || [], 'Correct transaction data not found');
  }

  if (!Array.isArray(receivedEvents) || receivedEvents.length === 0) {
    return manualReviewResponse(brokenTransaction.transactionId, brokenTransaction.anomalyType, receivedEvents || [], 'Received events are empty');
  }

  for (let i = 0; i < receivedEvents.length; i += 1) {
    if (!correctEvents.includes(receivedEvents[i])) {
      return manualReviewResponse(brokenTransaction.transactionId, brokenTransaction.anomalyType, receivedEvents, 'Invalid event found in received data');
    }
  }

  const uniqueEvents = [];
  for (let i = 0; i < receivedEvents.length; i += 1) {
    const event = receivedEvents[i];
    if (!uniqueEvents.includes(event)) {
      uniqueEvents.push(event);
    }
  }

  const healedEvents = [];
  for (let i = 0; i < correctEvents.length; i += 1) {
    const event = correctEvents[i];
    if (uniqueEvents.includes(event)) {
      healedEvents.push(event);
    }
  }

  if (healedEvents.length === 0) {
    return manualReviewResponse(brokenTransaction.transactionId, brokenTransaction.anomalyType, receivedEvents, 'Transaction data is too inconsistent to trust safely');
  }

  if (healedEvents.length === 1) {
    return {
      transactionId: brokenTransaction.transactionId,
      anomalyType: brokenTransaction.anomalyType,
      originalEvents: receivedEvents,
      healedEvents: correctEvents,
      status: 'RESOLVED',
    };
  }

  return {
    transactionId: brokenTransaction.transactionId,
    anomalyType: brokenTransaction.anomalyType,
    originalEvents: receivedEvents,
    healedEvents,
    status: 'RESOLVED',
  };
}

module.exports = { healTransaction };
