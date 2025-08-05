// TrainData/AdminBE/routes/page.routes.js
const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page.controller');

// Các route này đã được bảo vệ bởi admin middleware ở file index
router.route('/').get(pageController.getPages).post(pageController.createPage);
router.route('/:id').get(pageController.getPage).put(pageController.updatePage).delete(pageController.deletePage);

module.exports = router;