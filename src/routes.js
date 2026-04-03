const express = require('express');
const { transactions, anomalies } = require('./mockData');
const { healTransaction } = require('./healService');

const router = express.Router();

router.get('/mock-gateway/transaction/:id', (req, res) => {
  const transaction = transactions.find((item) => item.transactionId === req.params.id);

  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  res.json(transaction);
});

router.get('/anomalies', (req, res) => {
  res.json(anomalies);
});

router.get('/heal/:id', (req, res) => {
  const result = healTransaction(req.params.id);

  if (result.error) {
    return res.status(404).json(result);
  }

  res.json(result);
});

router.post('/heal/:id', (req, res) => {
  const result = healTransaction(req.params.id);

  if (result.error) {
    return res.status(404).json(result);
  }

  res.json(result);
});

module.exports = router;
