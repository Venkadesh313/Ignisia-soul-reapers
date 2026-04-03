-- ============================================================
-- Webhook Reconciliation Engine — Supabase Schema Migrations
-- Run this entire script in the Supabase SQL Editor.
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. EVENTS TABLE
--    Add reconciliation_status and processed_at columns.
-- ────────────────────────────────────────────────────────────

-- Ensure the base events table exists (created in initial setup)
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_id      TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  raw_payload JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns (safe: ALTER TABLE ADD COLUMN IF NOT EXISTS)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Index for fast lookups by txn_id and ordering
CREATE INDEX IF NOT EXISTS idx_events_txn_id ON events(txn_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);


-- ────────────────────────────────────────────────────────────
-- 2. TRANSACTIONS TABLE
--    Add reconciliation, anomaly, explanation, and heal columns.
-- ────────────────────────────────────────────────────────────

-- Ensure the base transactions table exists
CREATE TABLE IF NOT EXISTS transactions (
  id         TEXT PRIMARY KEY,
  status     TEXT,
  amount     NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS anomaly_reason         TEXT,
  ADD COLUMN IF NOT EXISTS explanation            TEXT,
  ADD COLUMN IF NOT EXISTS healed_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ DEFAULT NOW();

-- Index for fast status queries
CREATE INDEX IF NOT EXISTS idx_transactions_reconciliation_status
  ON transactions(reconciliation_status);


-- ────────────────────────────────────────────────────────────
-- 3. ANOMALIES TABLE (new)
--    Stores one record per anomaly detection run per transaction.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS anomalies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT        NOT NULL,
  status         TEXT        NOT NULL,  -- CLEAN | ANOMALY | RESOLVED | UNRESOLVABLE
  anomaly_reason TEXT,
  explanation    TEXT,
  details        JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_transaction_id ON anomalies(transaction_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_status         ON anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_created_at     ON anomalies(created_at);


-- ────────────────────────────────────────────────────────────
-- 4. ISSUES TABLE (ensure compatibility with existing code)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issues (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_id     TEXT NOT NULL,
  issue_type TEXT,
  details    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_txn_id ON issues(txn_id);


-- ────────────────────────────────────────────────────────────
-- 5. Helper function: updated_at auto-update trigger
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_transactions_updated_at ON transactions;
CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
