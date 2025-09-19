const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Endpoint: GET /api/public/settings
router.get('/settings', publicController.getPublicSettings);
router.get('/pre-footer', publicController.getPreFooterForPath);

// THÊM ROUTE MỚI
router.get('/page-categories', publicController.getPublicPageCategories);
router.get('/topics', publicController.getPublicTopics);


module.exports = router;