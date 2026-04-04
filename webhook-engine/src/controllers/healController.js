const { healTransaction } = require('../services/healService');
const logger = require('../utils/logger');

/**
 * POST /heal
 * Body: { transaction_id: string, gaps?: object[] }
 */
async function healController(req, res) {
  try {
    const { transaction_id, gaps = [] } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ error: 'transaction_id required' });
    }

    const result = await healTransaction(transaction_id, gaps);
    return res.status(200).json(result);
  } catch (err) {
    logger.error('healController error', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { healController };
