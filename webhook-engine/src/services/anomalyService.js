/**
 * Anomaly detection over a normalized, ordered event type array.
 * @param {string[]} eventTypesArray
 * @returns {Array<{type: string, detail: string, missingEvent?: string}>}
 */
function detectAnomalies(eventTypesArray) {
  try {
    const anomalies = [];

    // Special case: created → failed only is valid, no anomalies
    if (
      eventTypesArray.length === 2 &&
      eventTypesArray[0] === 'created' &&
      eventTypesArray[1] === 'failed'
    ) {
      return [];
    }

    // DUPLICATE: same event type appears more than once
    const seen = {};
    for (const event of eventTypesArray) {
      seen[event] = (seen[event] || 0) + 1;
    }
    for (const [event, count] of Object.entries(seen)) {
      if (count > 1) {
        anomalies.push({
          type: 'DUPLICATE',
          detail: `Event '${event}' appears ${count} times`
        });
      }
    }

    // OUT_OF_ORDER: 'created' not at index 0
    const createdIndex = eventTypesArray.indexOf('created');
    if (createdIndex !== -1 && createdIndex !== 0) {
      anomalies.push({
        type: 'OUT_OF_ORDER',
        detail: `'created' found at index ${createdIndex}, expected index 0`
      });
    }

    // MISSING: 'captured' absent between 'created' and 'settled'/'refunded'
    const hasSettledOrRefunded =
      eventTypesArray.includes('settled') || eventTypesArray.includes('refunded');
    const hasCaptured = eventTypesArray.includes('captured');

    if (hasSettledOrRefunded && !hasCaptured) {
      anomalies.push({
        type: 'MISSING',
        detail: `'captured' expected before 'settled'/'refunded' but not found`,
        missingEvent: 'captured'
      });
    }

    return anomalies;
  } catch (err) {
    return [{ type: 'ERROR', detail: `Anomaly detection error: ${err.message}` }];
  }
}

module.exports = { detectAnomalies };
