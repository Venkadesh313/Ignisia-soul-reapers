// controllers/webhookController.js
// Handles incoming webhook requests and delegates to the service layer.
// Also handles GET endpoints for transactions, events, issues, and metrics.

const {
  insertEvent,
  upsertTransaction,
  getAllTransactions,
  getEventsByTxnId,
  getAllIssues,
  runStateMachine,
  saveAnomalyRecord,
  updateTransactionStatus,
} = require('../services/eventService');

const { detectPatternAnomaly } = require('../services/aiDetection');
const { healTransaction }       = require('../services/autoHealService');
const { generateExplanation }   = require('../utils/explanationGenerator');
const supabase                  = require('../supabaseClient');


/**
 * POST /webhook
 * Receives a webhook event payload.
 * Validation, signature verification, and idempotency are handled by middleware.
 *
 * Full pipeline:
 *   1. Insert event into DB
 *   2. Upsert transaction record
 *   3. Run state machine analysis
 *   4. Run AI pattern detection
 *   5. If anomaly → generate explanation → attempt auto-heal
 *   6. Save anomaly record with final status
 */
const handleWebhook = async (req, res) => {
  const { txn_id, event_type, amount } = req.body;

  console.log(`[WEBHOOK] Received event: txn_id="${txn_id}", event_type="${event_type}", amount=${amount ?? 'N/A'}`);

  try {
    // ── Step 1: Store the raw event ───────────────────────────────────────────
    const insertedEvent = await insertEvent({
      txn_id,
      event_type,
      raw_payload: req.body,
    });
    console.log(`[DB] Event inserted for txn_id="${txn_id}":`, insertedEvent);

    // ── Step 2: Upsert transaction record ─────────────────────────────────────
    const upsertedTxn = await upsertTransaction({ txn_id, event_type, amount });
    console.log(`[DB] Transaction upserted for txn_id="${txn_id}":`, upsertedTxn);

    // ── Step 3: State Machine Analysis ───────────────────────────────────────
    const smResult = await runStateMachine(txn_id);
    console.log(`[STATE_MACHINE] txn_id="${txn_id}" result:`, smResult);

    // ── Step 4: AI Pattern Detection ─────────────────────────────────────────
    // Fetch all events for this txn to pass as context
    const { data: txnEvents } = await supabase
      .from('events')
      .select('event_type, created_at')
      .eq('txn_id', txn_id)
      .order('created_at', { ascending: true });

    const aiResult = await detectPatternAnomaly({
      txn_id,
      events:      txnEvents || [],
      receiveTime: new Date().toISOString(),
    });
    console.log(`[AI_DETECTION] txn_id="${txn_id}" result:`, aiResult);

    // ── Step 5: Determine final anomaly status ────────────────────────────────
    const isAnomaly   = smResult.status === 'ANOMALY' || aiResult.isAnomaly;
    const anomalyType = smResult.anomalyType || aiResult.reason || null;

    let finalStatus  = isAnomaly ? 'ANOMALY' : 'CLEAN';
    let explanation  = null;
    let healResult   = null;

    if (isAnomaly) {
      // Step 5a: Generate human-readable explanation
      explanation = generateExplanation(anomalyType || 'UNKNOWN');
      console.log(`[EXPLANATION] txn_id="${txn_id}" anomalyType="${anomalyType}": ${explanation}`);

      // Step 5b: Attempt auto-heal
      try {
        healResult = await healTransaction(txn_id);
        finalStatus = healResult.result; // RESOLVED or UNRESOLVABLE
        console.log(`[AUTO_HEAL] txn_id="${txn_id}" heal result:`, healResult);
      } catch (healErr) {
        console.error(`[AUTO_HEAL] Failed for txn_id="${txn_id}":`, healErr.message);
        finalStatus = 'UNRESOLVABLE';
      }

      // Step 5c: Update transaction's reconciliation fields
      await updateTransactionStatus(txn_id, {
        reconciliation_status: finalStatus,
        anomaly_reason:        anomalyType,
        explanation,
      });
    } else {
      // Mark as CLEAN on the transaction
      await updateTransactionStatus(txn_id, { reconciliation_status: 'CLEAN' });
    }

    // ── Step 6: Save anomaly record ───────────────────────────────────────────
    await saveAnomalyRecord({
      transaction_id: txn_id,
      status:         finalStatus,
      anomaly_reason: anomalyType,
      explanation,
      details: {
        stateMachine: smResult.details,
        aiDetection:  { reason: aiResult.reason, metrics: aiResult.metrics },
        healResult,
      },
    });

    // ── Response ──────────────────────────────────────────────────────────────
    return res.status(200).json({
      message:              'Webhook received and processed successfully.',
      txn_id,
      event_type,
      reconciliation_status: finalStatus,
      anomaly_type:          anomalyType,
      explanation,
      heal_result:           healResult ? healResult.result : null,
    });
  } catch (err) {
    console.error(`[ERROR] Failed to process webhook for txn_id="${txn_id}":`, err.message);
    return res.status(500).json({ error: 'Internal server error while processing webhook.' });
  }
};


/**
 * GET /transactions
 * Returns all transactions ordered by most recent.
 */
const getTransactions = async (req, res) => {
  try {
    const transactions = await getAllTransactions();
    console.log(`[GET] /transactions — returned ${transactions.length} records`);
    return res.status(200).json(transactions);
  } catch (err) {
    console.error('[ERROR] GET /transactions:', err.message);
    return res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
};

/**
 * GET /events/:txn_id
 * Returns all events for a given transaction ID.
 */
const getEvents = async (req, res) => {
  const { txn_id } = req.params;
  try {
    const events = await getEventsByTxnId(txn_id);
    console.log(`[GET] /events/${txn_id} — returned ${events.length} records`);
    return res.status(200).json(events);
  } catch (err) {
    console.error(`[ERROR] GET /events/${txn_id}:`, err.message);
    return res.status(500).json({ error: 'Failed to fetch events.' });
  }
};

/**
 * GET /issues
 * Returns all flagged issues.
 */
const getIssues = async (req, res) => {
  try {
    const issues = await getAllIssues();
    console.log(`[GET] /issues — returned ${issues.length} records`);
    return res.status(200).json(issues);
  } catch (err) {
    console.error('[ERROR] GET /issues:', err.message);
    return res.status(500).json({ error: 'Failed to fetch issues.' });
  }
};

/**
 * GET /metrics
 * Returns aggregate system-level reconciliation metrics.
 */
const getMetrics = async (req, res) => {
  try {
    // Total transactions count
    const { count: totalTxn, error: txnErr } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    if (txnErr) throw new Error(txnErr.message);

    // Total events count
    const { count: totalEvents, error: evtErr } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });
    if (evtErr) throw new Error(evtErr.message);

    // Failure events
    const { count: failureCount, error: failErr } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'failure');
    if (failErr) throw new Error(failErr.message);

    // Total anomaly records
    const { count: totalAnomalies, error: anomErr } = await supabase
      .from('anomalies')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'CLEAN');
    if (anomErr) throw new Error(anomErr.message);

    // Resolved anomalies
    const { count: resolvedCount, error: resErr } = await supabase
      .from('anomalies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'RESOLVED');
    if (resErr) throw new Error(resErr.message);

    const failure_rate      = totalEvents > 0 ? (failureCount  / totalEvents).toFixed(4) : '0.0000';
    const anomaly_rate      = totalTxn    > 0 ? (totalAnomalies / totalTxn).toFixed(4)   : '0.0000';
    const heal_success_rate = totalAnomalies > 0 ? (resolvedCount / totalAnomalies).toFixed(4) : '0.0000';

    return res.status(200).json({
      total_transactions: totalTxn,
      total_events:       totalEvents,
      failure_rate:       parseFloat(failure_rate),
      anomaly_rate:       parseFloat(anomaly_rate),
      heal_success_rate:  parseFloat(heal_success_rate),
      raw: {
        failure_events:   failureCount,
        total_anomalies:  totalAnomalies,
        resolved_anomalies: resolvedCount,
      },
    });
  } catch (err) {
    console.error('[ERROR] GET /metrics:', err.message);
    return res.status(500).json({ error: 'Failed to fetch metrics.' });
  }
};

module.exports = {
  handleWebhook,
  getTransactions,
  getEvents,
  getIssues,
  getMetrics,
};
