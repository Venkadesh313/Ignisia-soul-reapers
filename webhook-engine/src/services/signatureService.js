/**
 * Webhook Signature Verification Service
 * 
 * Verifies incoming webhook payloads using HMAC SHA-256.
 * Uses Node.js built-in `crypto` module — no external deps.
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Verify an HMAC SHA-256 signature against a payload.
 * 
 * @param {string|Buffer} payload   - The raw request body
 * @param {string}        signature - The signature from the webhook header
 * @param {string}        secret    - The shared HMAC secret
 * @returns {boolean} true if signature is valid, false otherwise
 */
function verifySignature(payload, signature, secret) {
  try {
    // Compute expected HMAC
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    // Lengths must match for timingSafeEqual
    if (sigBuffer.length !== expectedBuffer.length) {
      logger.warn('Signature length mismatch');
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (err) {
    logger.error('Signature verification failed', err.message);
    return false;
  }
}

module.exports = { verifySignature };
