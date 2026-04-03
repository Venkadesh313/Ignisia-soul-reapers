const express = require('express');
const { transactions, anomalies } = require('./mockData');
const { healTransaction } = require('./healService');

const router = express.Router();

// ── Mock Gateway: fetch a known-good transaction ─────────────────────────────
// Simulates calling Razorpay/Stripe's API to get the true event history
router.get('/mock-gateway/transaction/:id', (req, res) => {
  const transaction = transactions.find((item) => item.transactionId === req.params.id);

  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found in gateway' });
  }

  res.json(transaction);
});

// ── List all anomaly records ──────────────────────────────────────────────────
router.get('/anomalies', (req, res) => {
  res.json(anomalies);
});

// ── Heal a transaction (GET — easy to test in browser) ───────────────────────
router.get('/heal/:id', (req, res) => {
  const result = healTransaction(req.params.id);

  // MANUAL_REVIEW with "not found" reason → treat as 404
  if (result.status === 'MANUAL_REVIEW' && result.transactionId === req.params.id && !result.anomalyType) {
    return res.status(404).json(result);
  }

  res.json(result);
});

// ── Heal a transaction (POST — for integration with Person 1/2) ──────────────
router.post('/heal/:id', (req, res) => {
  const result = healTransaction(req.params.id);

  if (result.status === 'MANUAL_REVIEW' && !result.anomalyType) {
    return res.status(404).json(result);
  }

  res.json(result);
});

module.exports = router;