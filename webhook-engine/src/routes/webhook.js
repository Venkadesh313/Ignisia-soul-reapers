/**
 * Webhook Routes
 * 
 * Mounts the POST handler for incoming webhook events
 * with rate limiting middleware applied.
 */

const express = require('express');
const router = express.Router();

const { handleWebhook } = require('../controllers/webhookController');
const { rateLimiter } = require('../middleware/rateLimiter');

// POST / — Receive a webhook event
// Rate limiter runs first; if the limit is exceeded,
// the request is queued and a 202 is returned before the controller runs.
router.post('/', rateLimiter, handleWebhook);

module.exports = router;
