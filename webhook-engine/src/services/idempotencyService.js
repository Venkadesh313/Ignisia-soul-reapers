/**
 * Idempotency Service
 *
 * Atomic Redis SET NX check-and-mark.
 * Stores a JSON payload so the original timestamp is recoverable
 * for downstream replay analysis.
 */

const { redisClient } = require('../config/redis');
const logger = require('../utils/logger');

const EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Atomically mark an event as seen, or detect it as a duplicate.
 * @param {string} eventId - idempotency key
 * @returns {Promise<{isDuplicate: boolean, originalTimestamp?: number}>}
 */
async function checkAndMark(eventId) {
  try {
    const key = `webhook:event:${eventId}`;
    const value = JSON.stringify({ seenAt: Date.now() });

    // SET NX returns 'OK' if newly set, null if key already existed
    const result = await redisClient.set(key, value, {
      NX: true,
      EX: EXPIRY_SECONDS,
    });

    if (result === 'OK') {
      logger.info(`Event ${eventId} is new`);
      return { isDuplicate: false };
    }

    // Already exists — retrieve original timestamp
    const existing = await redisClient.get(key);
    let originalTimestamp = Date.now(); // fallback
    try {
      const parsed = JSON.parse(existing);
      originalTimestamp = parsed.seenAt ?? originalTimestamp;
    } catch (_) {
      // malformed value — use fallback
    }

    logger.warn(`Duplicate event detected: ${eventId}`);
    return { isDuplicate: true, originalTimestamp };
  } catch (err) {
    logger.error('checkAndMark failed', err.message);
    // Fail open — treat as new to avoid silently dropping events
    return { isDuplicate: false };
  }
}

module.exports = { checkAndMark };
