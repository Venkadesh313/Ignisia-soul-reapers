// server.js
// Entry point for the Webhook Reconciliation Engine.
// Sets up Express with CORS, JSON parsing, request logging, and mounts all routes.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const webhookRoutes = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

// Enable CORS for all origins (adjust in production as needed)
app.use(cors());

// Parse incoming JSON request bodies
// The verify callback captures the raw buffer so signatureVerification middleware
// can recompute the HMAC without any string transformation loss.
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf; // Buffer — used by middleware/signatureVerification.js
  },
}));

// Basic request logging middleware — logs method, path, and timestamp
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[REQUEST] ${timestamp} ${req.method} ${req.path}`);
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// Mount all webhook + query routes at root level
app.use('/', webhookRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler (catches any unhandled errors passed via next(err))
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err.message);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Webhook Reconciliation Engine running on http://localhost:${PORT}`);
  console.log(`   POST /webhook                — ingest webhook events (sig + idempotency)`);
  console.log(`   GET  /transactions           — fetch all transactions`);
  console.log(`   GET  /events/:txn_id         — fetch events by transaction`);
  console.log(`   GET  /issues                 — fetch all issues`);
  console.log(`   GET  /metrics                — system-wide reconciliation metrics`);
  console.log(`   GET  /mock-gateway/:txn_id   — simulated canonical gateway history`);
  console.log(`   GET  /health                 — server health check\n`);
});
