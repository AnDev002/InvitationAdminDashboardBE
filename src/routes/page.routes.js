// TrainData/AdminBE/routes/page.routes.js
const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page.controller');
const { upload } = require('../middleware/upload.middleware');
const { uploadFileToR2 } = require('../services/r2.service');
const sharp = require('sharp');

// Các route này đã được bảo vệ bởi admin middleware ở file index
router.route('/').get(pageController.getPages).post(pageController.createPage);
router.route('/:id').get(pageController.getPage).put(pageController.updatePage).delete(pageController.deletePage);

router.route('/')
    .get(pageController.getPages)
    .post(upload.any(), pageController.createPage); // <-- THÊM MIDDLEWARE

router.route('/:id')
    .get(pageController.getPage)
    .put(upload.any(), pageController.updatePage) // <-- THÊM MIDDLEWARE
    .delete(pageController.deletePage);
module.exports = router;