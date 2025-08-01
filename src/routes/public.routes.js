const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Endpoint: GET /api/public/settings
router.get('/settings', publicController.getPublicSettings);

module.exports = router;