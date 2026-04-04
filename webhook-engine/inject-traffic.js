const crypto = require('crypto');

// URL for your new webhook-engine
const URL = "http://localhost:3000/webhook";

// The secret must match your webhook-engine .env WEBHOOK_SECRET
// If you don't have one set, the backend might crash or reject signatures. Ensure it is set!
const SECRET = process.env.WEBHOOK_SECRET || "test_secret_123"; 

async function sendWebhook(payload) {
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  
  console.log(`\n📡 Injecting: [${payload.event_type}] for ${payload.transaction_id || payload.txn_id}`);
  
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature
      },
      body: body
    });
    
    // We only read text because rate limits return 202 without json sometimes.
    const responseText = await res.text();
    console.log(`✅ Result: ${res.status} =>`, responseText);
  } catch (err) {
    console.error(`❌ Connection Failed: Is webhook-engine running?`, err.message);
  }
}

async function runDemo() {
  console.log("============= HACKATHON SIMULATOR STARTING =============");
  
  const timeId = Date.now();
  
  // SCENARIO 1: Structural Anomaly - Missing Created Event (Triggers delay and out-of-order)
  console.log("\n[SCENARIO 1] Out-of-Order Webhook (Missing Creation)");
  await sendWebhook({ transaction_id: `txn_missing_${timeId}`, event_type: "captured", amount: 200, idempotency_key: `idk_${timeId}_1` });
  
  await new Promise(r => setTimeout(r, 2000));

  // SCENARIO 2: Retry Storm - Duplicate Payment Postings
  console.log("\n[SCENARIO 2] Retry Storm (Triggers duplicate protection & surge limits)");
  const stormKey = `idk_storm_${timeId}`;
  await sendWebhook({ transaction_id: `txn_storm_${timeId}`, event_type: "created", amount: 50, idempotency_key: stormKey });
  await sendWebhook({ transaction_id: `txn_storm_${timeId}`, event_type: "created", amount: 50, idempotency_key: stormKey });
  await sendWebhook({ transaction_id: `txn_storm_${timeId}`, event_type: "created", amount: 50, idempotency_key: stormKey });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // SCENARIO 3: Rate Limit & Failure Spike
  console.log("\n[SCENARIO 3] Rapid Failure Spike (Triggers pattern flags)");
  for(let i=0; i<6; i++) {
    await sendWebhook({ transaction_id: `txn_failure_${timeId}_${i}`, event_type: "failed", amount: 10, idempotency_key: `idk_fail_${timeId}_${i}` });
    await new Promise(r => setTimeout(r, 100)); // fast firing
  }

  // SCENARIO 4: Refund Spike
  console.log("\n[SCENARIO 4] Refund Anomaly");
  for(let i=0; i<3; i++) {
    await sendWebhook({ transaction_id: `txn_refund_${timeId}_${i}`, event_type: "refunded", amount: 15, idempotency_key: `idk_refund_${timeId}_${i}` });
  }

  console.log("\n============= SIMULATION COMPLETE =============");
  console.log(">>> Switch to your React Dashboard to see the UI update instantly!");
}

runDemo();
