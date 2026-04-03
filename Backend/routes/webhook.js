// routes/webhook.js
// Defines all API routes and applies relevant middleware.
// Extended with: signature verification, mock gateway, and metrics endpoint.

const express = require('express');
const router  = express.Router();

const { verifySignature }  = require('../middleware/signatureVerification');
const { validatePayload }  = require('../middleware/validation');
const { checkIdempotency } = require('../middleware/idempotency');

const {
  handleWebhook,
  getTransactions,
  getEvents,
  getIssues,
  getMetrics,
} = require('../controllers/webhookController');

// ─── Webhook Ingestion ────────────────────────────────────────────────────────
// POST /webhook
// Middleware chain (left → right):
//   1. verifySignature  — reject invalid HMAC-SHA256 signatures (401)
//   2. validatePayload  — reject missing/empty required fields (400)
//   3. checkIdempotency — skip already-processed events (200 early return)
//   4. handleWebhook    — full reconciliation pipeline
router.post('/webhook', verifySignature, validatePayload, checkIdempotency, handleWebhook);

// ─── Query Endpoints ──────────────────────────────────────────────────────────

// GET /transactions — return all transactions with reconciliation status
router.get('/transactions', getTransactions);

// GET /events/:txn_id — return all events for a transaction
router.get('/events/:txn_id', getEvents);

// GET /issues — return all flagged issues
router.get('/issues', getIssues);

// GET /metrics — return aggregate reconciliation metrics
router.get('/metrics', getMetrics);

// ─── Mock Gateway ─────────────────────────────────────────────────────────────
// GET /mock-gateway/:transaction_id
// Returns a simulated "canonical" transaction history.
// Used by autoHealService to fetch the correct expected event sequence.
router.get('/mock-gateway/:transaction_id', (req, res) => {
  const { transaction_id } = req.params;

  // Simulate the canonical lifecycle for any transaction
  const canonicalEvents = [
    { event_type: 'created',  txn_id: transaction_id, simulated: true },
    { event_type: 'captured', txn_id: transaction_id, simulated: true },
    { event_type: 'success',  txn_id: transaction_id, simulated: true },
  ];

  console.log(`[MOCK_GATEWAY] Returning canonical events for transaction_id="${transaction_id}"`);

  return res.status(200).json({
    transaction_id,
    events: canonicalEvents,
    source: 'mock-gateway',
    note:   'Simulated canonical transaction history for auto-healing.',
  });
});

module.exports = router;
