const express = require('express');
const router = express.Router();
const { healController } = require('../controllers/healController');

router.post('/', healController);

module.exports = router;
