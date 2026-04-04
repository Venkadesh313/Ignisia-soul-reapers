const express = require('express');
const router  = express.Router();
const { resolveReview } = require('../controllers/reviewController');

router.post('/resolve', resolveReview);

module.exports = router;
