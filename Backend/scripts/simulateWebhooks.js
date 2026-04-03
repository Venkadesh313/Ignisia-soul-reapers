#!/usr/bin/env node
// scripts/simulateWebhooks.js
// Webhook simulation test script for the Reconciliation Engine.
//
// Sends a series of HTTP requests to test four key scenarios:
//   1. Happy path      — correct lifecycle order (created → captured → success)
//   2. Duplicate       — same event_type + txn_id sent twice
//   3. Out-of-order    — success before captured
//   4. Missing event   — captured → success (skips created)
//
// Usage: node scripts/simulateWebhooks.js
// Prerequisites: Server must be running (npm start or node server.js)

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const http   = require('http');
const crypto = require('crypto');

// ─── Config ───────────────────────────────────────────────────────────────────

const HOST   = 'localhost';
const PORT   = process.env.PORT || 3000;
const SECRET = process.env.WEBHOOK_SECRET || 'your_webhook_signing_secret_here';
const BASE   = `http://${HOST}:${PORT}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Compute HMAC-SHA256 signature over a JSON body string.
 * Mirrors the logic in signatureVerification.js.
 */
const sign = (bodyStr) =>
  crypto.createHmac('sha256', SECRET).update(bodyStr).digest('hex');

/**
 * Send a single POST /webhook request and return the response.
 * @param {object} payload
 * @returns {Promise<{ status: number, body: object }>}
 */
const sendWebhook = (payload) => {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload);
    const sig     = sign(bodyStr);

    const options = {
      hostname: HOST,
      port:     PORT,
      path:     '/webhook',
      method:   'POST',
      headers: {
        'Content-Type':          'application/json',
        'Content-Length':        Buffer.byteLength(bodyStr),
        'x-webhook-signature':   sig,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.write(bodyStr);
    req.end();
  });
};

/**
 * Sleep for a given number of milliseconds.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Logging ─────────────────────────────────────────────────────────────────

const PASS = '\x1b[32m✓ PASS\x1b[0m';
const FAIL = '\x1b[31m✗ FAIL\x1b[0m';
const INFO = '\x1b[36mℹ\x1b[0m ';
const SEP  = '\x1b[90m─'.repeat(60) + '\x1b[0m';

const log = (label, response, expectStatus) => {
  const ok  = response.status === expectStatus;
  const icon = ok ? PASS : FAIL;
  console.log(`${icon} [${response.status}] ${label}`);
  if (response.body && typeof response.body === 'object') {
    const summary = {};
    for (const k of ['reconciliation_status','anomaly_type','heal_result','message','error']) {
      if (response.body[k] !== undefined) summary[k] = response.body[k];
    }
    if (Object.keys(summary).length) console.log(`     ${INFO}`, summary);
  }
};

// ─── Scenarios ────────────────────────────────────────────────────────────────

const runScenarios = async () => {
  console.log('\n\x1b[1m🧪 Webhook Reconciliation Engine — Simulation Test\x1b[0m');
  console.log(`   Target: ${BASE}/webhook`);
  console.log(`   Secret: ${SECRET.slice(0, 8)}...\n`);

  // ────────────────────────────────────────────────────────────────
  // SCENARIO 1: Happy Path — correct lifecycle order
  // ────────────────────────────────────────────────────────────────
  console.log(SEP);
  console.log('\x1b[1m[Scenario 1] Happy Path — created → captured → success\x1b[0m\n');
  const happyTxn = `txn_happy_${Date.now()}`;
  for (const event_type of ['created', 'captured', 'success']) {
    const r = await sendWebhook({ txn_id: happyTxn, event_type, amount: 99.99 });
    log(`  ${event_type}`, r, 200);
    await sleep(100);
  }

  // ────────────────────────────────────────────────────────────────
  // SCENARIO 2: Duplicate event — send same event twice
  // ────────────────────────────────────────────────────────────────
  console.log(`\n${SEP}`);
  console.log('\x1b[1m[Scenario 2] Duplicate Event — same txn_id + event_type twice\x1b[0m\n');
  const dupTxn = `txn_dup_${Date.now()}`;
  const r2a = await sendWebhook({ txn_id: dupTxn, event_type: 'created', amount: 50 });
  log('  created (first send)', r2a, 200);
  await sleep(100);
  const r2b = await sendWebhook({ txn_id: dupTxn, event_type: 'created', amount: 50 });
  log('  created (duplicate — expect 200 "Duplicate ignored")', r2b, 200);
  const dupIgnored = typeof r2b.body === 'object' && r2b.body.message === 'Duplicate ignored';
  console.log(`  ${dupIgnored ? PASS : FAIL} Duplicate correctly ignored`);

  // ────────────────────────────────────────────────────────────────
  // SCENARIO 3: Out-of-order — success before captured
  // ────────────────────────────────────────────────────────────────
  console.log(`\n${SEP}`);
  console.log('\x1b[1m[Scenario 3] Out-of-Order — success arrives before captured\x1b[0m\n');
  const oooTxn = `txn_ooo_${Date.now()}`;
  for (const event_type of ['created', 'success', 'captured']) {
    const r = await sendWebhook({ txn_id: oooTxn, event_type, amount: 200 });
    log(`  ${event_type}`, r, 200);
    await sleep(100);
  }
  const r3final = await sendWebhook({ txn_id: oooTxn, event_type: 'captured', amount: 200 });
  // After the last event the state machine should detect OOO anomaly
  const isOOO = typeof r3final.body === 'object' && r3final.body.reconciliation_status !== 'CLEAN';
  console.log(`  ${INFO} Final reconciliation_status: ${r3final.body?.reconciliation_status || 'N/A'}`);

  // ────────────────────────────────────────────────────────────────
  // SCENARIO 4: Missing event — captured → success (no "created")
  // ────────────────────────────────────────────────────────────────
  console.log(`\n${SEP}`);
  console.log('\x1b[1m[Scenario 4] Missing Event — captured + success (no "created")\x1b[0m\n');
  const missTxn = `txn_missing_${Date.now()}`;
  for (const event_type of ['captured', 'success']) {
    const r = await sendWebhook({ txn_id: missTxn, event_type, amount: 150 });
    log(`  ${event_type}`, r, 200);
    await sleep(100);
  }
  const r4 = await sendWebhook({ txn_id: missTxn, event_type: 'success', amount: 150 });
  console.log(`  ${INFO} Last event reconciliation_status: ${r4.body?.reconciliation_status || 'N/A'}`);
  console.log(`  ${INFO} Anomaly type: ${r4.body?.anomaly_type || 'N/A'}`);
  console.log(`  ${INFO} Explanation: ${r4.body?.explanation?.slice(0, 80) || 'N/A'}...`);

  // ────────────────────────────────────────────────────────────────
  // SCENARIO 5: Invalid signature — should get 401
  // ────────────────────────────────────────────────────────────────
  console.log(`\n${SEP}`);
  console.log('\x1b[1m[Scenario 5] Invalid Signature — expect 401\x1b[0m\n');
  await new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify({ txn_id: 'txn_badsig', event_type: 'created' });
    const options = {
      hostname: HOST, port: PORT, path: '/webhook', method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'Content-Length':       Buffer.byteLength(bodyStr),
        'x-webhook-signature':  'deadbeefdeadbeefdeadbeefdeadbeef',
      },
    };
    const req = http.request(options, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        const ok = res.statusCode === 401;
        console.log(`  ${ok ? PASS : FAIL} Invalid signature rejected with ${res.statusCode}`);
        resolve();
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });

  // ────────────────────────────────────────────────────────────────
  // Final summary
  // ────────────────────────────────────────────────────────────────
  console.log(`\n${SEP}`);
  console.log('\n\x1b[1m📊 Check aggregate metrics:\x1b[0m');
  await new Promise((resolve, reject) => {
    http.get(`${BASE}/metrics`, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          const m = JSON.parse(d);
          console.log(`   Total transactions : ${m.total_transactions}`);
          console.log(`   Total events       : ${m.total_events}`);
          console.log(`   Failure rate       : ${m.failure_rate}`);
          console.log(`   Anomaly rate       : ${m.anomaly_rate}`);
          console.log(`   Heal success rate  : ${m.heal_success_rate}`);
        } catch { console.log('   Could not parse metrics:', d); }
        resolve();
      });
    }).on('error', reject);
  });

  console.log('\n\x1b[32m✅ Simulation complete.\x1b[0m\n');
};

// ─── Entry Point ─────────────────────────────────────────────────────────────

runScenarios().catch((err) => {
  console.error('\n\x1b[31m[ERROR] Simulation failed:\x1b[0m', err.message);
  console.error('Make sure the server is running: node server.js');
  process.exit(1);
});
