const { KNOWN_EVENTS } = require('../constants/transitions');

/**
 * Trim and lowercase a single event type string.
 * @param {string} str
 * @returns {string}
 */
function normalizeEventType(str) {
  return str.trim().toLowerCase();
}

/**
 * Map raw DB rows to normalized event type strings, filtering out unknowns.
 * @param {Array<{event_type: string}>} rows
 * @returns {string[]}
 */
function normalizeEvents(rows) {
  return rows
    .map(row => normalizeEventType(row.event_type))
    .filter(type => KNOWN_EVENTS.includes(type));
}

module.exports = { normalizeEventType, normalizeEvents };
