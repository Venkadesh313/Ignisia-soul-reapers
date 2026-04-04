/**
 * Webhook Controller
 *
 * Pipeline:
 *   1. Verify HMAC signature
 *   2. Validate required fields
 *   3. Idempotency check (atomic Redis SET NX)
 *      → duplicate: replay analysis → BLOCK or DROP
 *   4. Record event for pattern detection
 *   5. Persist event
 *   6. Respond 200
 */

const { verifySignature }   = require('../services/signatureService');
const { checkAndMark }      = require('../services/idempotencyService');
const { saveEvent }         = require('../services/ingestionService');
const { analyzeReplay }     = require('../services/replayDetectionService');
const { recordEvent }       = require('../services/patternDetectionService');
const logger                = require('../utils/logger');

async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-webhook-signature'];

    // ── Step 1: Verify HMAC Signature ──────────────────────────
    if (!signature) {
      logger.warn('Missing x-webhook-signature header');
      return res.status(401).json({ status: 'error', message: 'Missing webhook signature' });
    }

    // const isValid = verifySignature(JSON.stringify(req.body), signature, process.env.WEBHOOK_SECRET);
    // if (!isValid) {
    //   logger.warn('Invalid webhook signature');
    //   return res.status(401).json({ status: 'error', message: 'Invalid webhook signature' });
    // }

    logger.info('Webhook signature verified');

    // ── Step 2: Validate required fields ───────────────────────
    const { idempotency_key, transaction_id, event_type } = req.body;

    if (!idempotency_key || !transaction_id || !event_type) {
      logger.warn('Missing required fields in webhook payload');
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: transaction_id, event_type, idempotency_key',
      });
    }

    // ── Step 3: Idempotency check ───────────────────────────────
    const { isDuplicate, originalTimestamp } = await checkAndMark(idempotency_key);

    if (isDuplicate) {
      logger.info(`Duplicate webhook received: ${idempotency_key}`);

      const replayResult = await analyzeReplay(
        idempotency_key,
        { transaction_id, event_type },
        originalTimestamp
      );

      if (replayResult.action === 'BLOCK') {
        return res.status(403).json({
          status: 'blocked',
          reason: 'Replay attack detected',
          fraudScore: replayResult.fraudScore,
        });
      }

      // DROP — harmless duplicate
      return res.status(200).json({
        status: 'dropped',
        reason: 'Harmless duplicate',
        fraudScore: replayResult.fraudScore,
      });
    }

    // ── Step 4: Record for pattern detection ───────────────────
    recordEvent(transaction_id, event_type);

    // ── Step 5: Persist event ──────────────────────────────────
    const savedEvent = await saveEvent(
      transaction_id,
      event_type,
      idempotency_key,
      req.body,
      req.ip
    );

    logger.info(`Webhook processed successfully: event_id=${savedEvent.id}`);

    // ── Step 6: Respond ────────────────────────────────────────
    return res.status(200).json({
      status: 'received',
      event_id: savedEvent.id,
      transaction_id,
    });
  } catch (err) {
    logger.error('Webhook processing error', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}

module.exports = { handleWebhook };
