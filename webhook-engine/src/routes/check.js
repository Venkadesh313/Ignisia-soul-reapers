const express = require('express');
const router = express.Router();
const { checkTransaction } = require('../controllers/checkController');

router.post('/', checkTransaction);

module.exports = router;
