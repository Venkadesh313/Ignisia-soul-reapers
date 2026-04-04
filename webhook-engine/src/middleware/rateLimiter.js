/**
 * Dynamic Rate Limiter + Surge Protection
 *
 * Adjusts the per-second request cap based on observed avg response time.
 * Requests that exceed the cap are queued in-memory and drained every 200ms.
 */

const rateLimit = require('express-rate-limit');
const logger    = require('../utils/logger');

// ── Response time tracking ────────────────────────────────────
const responseTimings = []; // last 10 response times (ms)

function trackResponseTime(ms) {
  responseTimings.push(ms);
  if (responseTimings.length > 10) responseTimings.shift();
}

function getAvgResponseTime() {
  if (responseTimings.length === 0) return 50;
  return responseTimings.reduce((a, b) => a + b, 0) / responseTimings.length;
}

// ── Dynamic limit ─────────────────────────────────────────────
function getDynamicLimit() {
  const avg = getAvgResponseTime();
  if (avg < 50)  return 200;
  if (avg < 150) return 100;
  return 30;
}

// ── In-memory overflow queue ──────────────────────────────────
const inMemoryQueue = [];

// ── Rate limiter middleware ───────────────────────────────────
const rateLimiter = rateLimit({
  windowMs: 1000,
  max: (req) => getDynamicLimit(),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,

  handler: (req, res) => {
    inMemoryQueue.push(req.body);
    logger.warn(`Rate limit exceeded for IP ${req.ip} — queued (depth: ${inMemoryQueue.length})`);
    return res.status(202).json({
      status: 'queued',
      position: inMemoryQueue.length,
    });
  },
});

// ── Queue processor — drains up to 5 items every 200ms ───────
setInterval(async () => {
  if (inMemoryQueue.length === 0) return;

  const batch = inMemoryQueue.splice(0, 5);
  const { saveEvent } = require('../services/ingestionService');

  let processed = 0;
  for (const item of batch) {
    try {
      if (item.transaction_id && item.event_type && item.idempotency_key) {
        await saveEvent(item.transaction_id, item.event_type, item.idempotency_key, item, null);
        processed++;
      }
    } catch (err) {
      logger.error('[rateLimiter] Queue processor error', err.message);
    }
  }

  if (processed > 0) {
    logger.info(`[rateLimiter] Queue processor flushed ${processed} item(s)`);
  }
}, 200);

module.exports = { rateLimiter, trackResponseTime, getAvgResponseTime, getDynamicLimit, inMemoryQueue };
