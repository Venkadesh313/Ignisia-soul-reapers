const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        transaction_id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        sequence_no INTEGER,
        raw_payload JSONB,
        idempotency_key TEXT UNIQUE,
        source_ip TEXT,
        received_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transaction_status (
        id SERIAL PRIMARY KEY,
        transaction_id TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        gap_details JSONB,
        fraud_score FLOAT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS anomalies (
        id SERIAL PRIMARY KEY,
        transaction_id TEXT,
        anomaly_type TEXT,
        detail TEXT,
        fraud_score FLOAT DEFAULT 0,
        action TEXT DEFAULT 'FLAGGED',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('[INFO] All tables ready');
  } catch (err) {
    console.error('[ERROR] Table init failed:', err.message);
  }
}

initDB();

module.exports = pool;