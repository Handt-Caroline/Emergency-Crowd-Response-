const express = require('express');
const router = express.Router();

const { createAlert } = require('../controllers/alertsController');

// REAL route
router.post('/', createAlert);

module.exports = router;