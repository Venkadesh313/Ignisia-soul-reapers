const VALID_TRANSITIONS = {
  created:  ['captured', 'failed'],
  captured: ['settled', 'refunded', 'failed'],
  settled:  [],
  refunded: [],
  failed:   []
};

const END_STATES = ['settled', 'refunded', 'failed'];

const KNOWN_EVENTS = ['created', 'captured', 'settled', 'refunded', 'failed'];

module.exports = { VALID_TRANSITIONS, END_STATES, KNOWN_EVENTS };
