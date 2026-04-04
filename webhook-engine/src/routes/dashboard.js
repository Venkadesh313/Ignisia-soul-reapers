const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Pattern Insights Endpoint
router.get('/pattern-insights', dashboardController.getPatternInsights);

module.exports = router;
