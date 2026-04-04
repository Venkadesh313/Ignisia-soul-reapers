// middleware/idempotency.js
// Twist 1 & Twist 2: High Concurrency Memory Lock & Replay Attack AI Detection

const axios = require('axios');
const supabase = require('../supabaseClient');

// In-memory lock mechanism to strictly prevent DB read-after-write race conditions
// Stores { "txn_id:event_type": timestamp }
const lockMap = new Map();

// Optional memory cleanup interval
setInterval(() => lockMap.clear(), 1000 * 60 * 60);

const checkIdempotency = async (req, res, next) => {
  const { txn_id, event_type, amount } = req.body;
  const key = `${txn_id}:${event_type}`;
  const now = Date.now();

  try {
    if (lockMap.has(key)) {
      // Memory Lock triggered! Concurrency duplicate blocked instantly.
      const firstSeenTime = lockMap.get(key);
      const timingDeltaMs = now - firstSeenTime;

      console.log(`[IDEMPOTENCY_LOCK] Exact hit for ${key}. Timing Delta: ${timingDeltaMs}ms`);

      // ─── Twist 2: AI Security Profiling ──────────────────────────
      // Offload to Python to classify if this is Harmful (Replay) or Harmless (Retry)
      try {
        const securityDecision = await axios.post('http://localhost:8000/api/security-score', {
          transaction_id: txn_id,
          event_type: event_type,
          amount_cents: amount,
          timing_delta_ms: timingDeltaMs
        });

        const { is_malicious, fraud_score, reason } = securityDecision.data;

        if (is_malicious === 1) {
          console.error(`[SECURITY_AI] 🚨 Replay Attack Detected for ${txn_id}! Score: ${fraud_score}`);
          
          // Securely log the intercepted anomaly to Supabase for the UI
          await supabase.from('anomalies').insert({
            transaction_id: txn_id,
            status: 'MANUAL_REVIEW',
            anomaly_reason: 'REPLAY_ATTACK_BLOCKED',
            explanation: `AI Firewall Intercepted Malicious Duplicate. Fraud Probability: ${(fraud_score * 100).toFixed(1)}%. Trigger Context: ${reason}`
          });

          return res.status(403).json({ error: 'Malicious Replay Pattern Blocked' });
        } else {
          console.log(`[SECURITY_AI] Harmless network retry identified. Silently dropping.`);
          return res.status(200).json({ message: 'Harmless duplicate dropped' });
        }

      } catch (aiErr) {
        console.error('[SECURITY_AI] Engine unreachable:', aiErr.message);
        return res.status(200).json({ message: 'Duplicate dropped (AI Offline fallback)' });
      }
    }

    // Lock the transaction event immediately BEFORE querying DB
    lockMap.set(key, now);
    next();
  } catch (err) {
    console.error('[IDEMPOTENCY] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { checkIdempotency };
