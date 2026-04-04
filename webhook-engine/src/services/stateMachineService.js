const { VALID_TRANSITIONS, END_STATES } = require('../constants/transitions');

/**
 * Run the state machine over an ordered array of event types.
 * @param {string[]} eventTypesArray
 * @returns {{ status: 'CLEAN'|'PENDING'|'ANOMALY', reason?: string }}
 */
function runStateMachine(eventTypesArray) {
  try {
    if (!eventTypesArray || eventTypesArray.length === 0) {
      return { status: 'ANOMALY', reason: 'No events found' };
    }

    if (eventTypesArray[0] !== 'created') {
      return { status: 'ANOMALY', reason: 'Must start with created' };
    }

    for (let i = 0; i < eventTypesArray.length - 1; i++) {
      const current = eventTypesArray[i];
      const next = eventTypesArray[i + 1];
      const allowed = VALID_TRANSITIONS[current] || [];

      if (!allowed.includes(next)) {
        return { status: 'ANOMALY', reason: `Invalid transition ${current}→${next}` };
      }
    }

    const last = eventTypesArray[eventTypesArray.length - 1];

    if (!END_STATES.includes(last)) {
      return { status: 'PENDING', reason: 'Transaction in progress' };
    }

    return { status: 'CLEAN' };
  } catch (err) {
    return { status: 'ANOMALY', reason: `State machine error: ${err.message}` };
  }
}

module.exports = { runStateMachine };
