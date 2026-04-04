/**
 * Ingestion Service
 * 
 * Persists webhook events and their associated transactions
 * into PostgreSQL. Uses parameterized queries exclusively.
 */

const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * Save a webhook event and upsert the parent transaction.
 * 
 * @param {string} transactionId   - External transaction identifier
 * @param {string} eventType       - Type/category of the event
 * @param {string} idempotencyKey  - Unique key for deduplication
 * @param {object} rawPayload      - Full original webhook payload (stored as JSONB)
 * @param {string} sourceIp        - IP address of the webhook sender
 * @returns {Promise<object>} The saved event row
 */
async function saveEvent(transactionId, eventType, idempotencyKey, rawPayload, sourceIp) {
  const client = await pool.connect();

  try {
    // Use a transaction to ensure both inserts succeed or fail together
    await client.query('BEGIN');

    // 1. Insert into webhook_events table
    const insertEventQuery = `
      INSERT INTO webhook_events 
        (transaction_id, event_type, idempotency_key, raw_payload, source_ip, received_at)
      VALUES 
        ($1, $2, $3, $4, $5, NOW())
      RETURNING *;
    `;
    const eventValues = [
      transactionId,
      eventType,
      idempotencyKey,
      JSON.stringify(rawPayload),
      sourceIp,
    ];
    const eventResult = await client.query(insertEventQuery, eventValues);

    // 2. Insert into transactions table (ignore if already exists)
    await pool.query(
      `INSERT INTO transactions (transaction_id, status)
       VALUES ($1, 'pending')
       ON CONFLICT (transaction_id) DO NOTHING`,
      [transactionId]
    );

    await client.query('COMMIT');

    const savedEvent = eventResult.rows[0];
    logger.info(`Event saved: id=${savedEvent.id}, txn=${transactionId}`);

    return savedEvent;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Failed to save event', err.message);
    throw err;
  } finally {
    // Return the client to the pool
    client.release();
  }
}

module.exports = { saveEvent };
