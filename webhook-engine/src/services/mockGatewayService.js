/**
 * Mock Gateway Service
 * Simulates an external payment gateway returning transaction history.
 */

/**
 * @param {string} transactionId
 * @returns {Promise<{found: boolean, events: string[]}>}
 */
async function getMockTransactionHistory(transactionId) {
  try {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 200));

    // All branches return the same full correct history
    // so auto-heal can always reconstruct missing events
    return {
      found: true,
      events: ['created', 'captured', 'settled']
    };
  } catch (err) {
    throw new Error(`getMockTransactionHistory failed: ${err.message}`);
  }
}

module.exports = { getMockTransactionHistory };
