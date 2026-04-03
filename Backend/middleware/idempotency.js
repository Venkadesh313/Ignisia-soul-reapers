// middleware/idempotency.js
// Prevents duplicate webhook events from being processed more than once.
// A duplicate is defined as an event with the same txn_id AND event_type already in the DB.

const supabase = require('../supabaseClient');

const checkIdempotency = async (req, res, next) => {
  const { txn_id, event_type } = req.body;

  try {
    // Query the events table for an existing record matching both txn_id and event_type
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .eq('txn_id', txn_id)
      .eq('event_type', event_type)
      .limit(1);

    if (error) {
      console.error('[IDEMPOTENCY] DB error during duplicate check:', error.message);
      return res.status(500).json({ error: 'Idempotency check failed.' });
    }

    if (data && data.length > 0) {
      // Duplicate detected — return 200 without processing again
      console.log(`[IDEMPOTENCY] Duplicate detected for txn_id="${txn_id}" event_type="${event_type}". Ignoring.`);
      return res.status(200).json({ message: 'Duplicate ignored' });
    }

    // Not a duplicate — proceed to controller
    next();
  } catch (err) {
    console.error('[IDEMPOTENCY] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error during idempotency check.' });
  }
};

module.exports = { checkIdempotency };
