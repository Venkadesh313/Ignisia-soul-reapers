/**
 * Webhook Reconciliation Engine — Entry Point
 * 
 * Loads environment config, initializes connections,
 * mounts routes, and starts the HTTP server.
 * 
 * No business logic lives here — only bootstrap and wiring.
 */

require('dotenv').config();

const express = require('express');
const logger = require('./src/utils/logger');
const { connectRedis } = require('./src/config/redis');
const webhookRoutes = require('./src/routes/webhook');
const checkRouter = require('./src/routes/check');
const healRouter     = require('./src/routes/heal');
const patternsRouter = require('./src/routes/patterns');
const reviewRouter   = require('./src/routes/review');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────
// Parse JSON request bodies
app.use(express.json());

// Trust proxy headers (needed for correct req.ip behind load balancers)
app.set('trust proxy', true);

// ── Routes ─────────────────────────────────────────────────────

// Health check endpoint
app.get('/status', (req, res) => {
  res.status(200).json({
    service: 'webhook-engine',
    status: 'running',
  });
});

// Webhook ingestion routes
app.use('/webhook', webhookRoutes);

// Transaction reconciliation check
app.use('/check', checkRouter);

// Auto-heal endpoint
app.use('/heal', healRouter);

// Pattern detection, replay security, and metrics
app.use('/patterns', patternsRouter);

// Human review decisions
app.use('/review', reviewRouter);

// ── Startup ────────────────────────────────────────────────────
async function start() {
  try {
    // Connect to Redis before accepting traffic
    await connectRedis();

    app.listen(PORT, () => {
      logger.info(`Webhook engine listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server', err.message);
    process.exit(1);
  }
}

start();
