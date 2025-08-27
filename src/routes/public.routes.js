const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Endpoint: GET /api/public/settings
router.get('/settings', publicController.getPublicSettings);
router.get('/invitation-templates/slug/:slug', publicController.getInvitationTemplateBySlug);

module.exports = router;