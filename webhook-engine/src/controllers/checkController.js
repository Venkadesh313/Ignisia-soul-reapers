const { processTransaction } = require('../services/processorService');
const { healTransaction } = require('../services/healService');
const logger = require('../utils/logger');

/**
 * POST /check
 * Body: { transaction_id: string }
 *
 * Call chain (no loop):
 *   checkController → processTransaction  (classify)
 *   checkController → healTransaction     (repair if ANOMALY)
 *   healTransaction → runStateMachine     (verify, no further heal)
 */
async function checkTransaction(req, res) {
  try {
    const { transaction_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ error: 'transaction_id required' });
    }

    const result = await processTransaction(transaction_id);

    if (result.status === 'ANOMALY') {
      const healResult = await healTransaction(transaction_id, result.gaps);
      return res.status(200).json({
        status: 'ANOMALY',
        gaps: result.gaps,
        healTriggered: true,
        healResult
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    logger.error('checkTransaction error', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { checkTransaction };
