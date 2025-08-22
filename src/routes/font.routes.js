// TrainData/AdminBE/routes/font.routes.js
const express = require('express');
const router = express.Router();
const fontController = require('../controllers/font.controller');
const { upload } = require('../middleware/upload.middleware');
const { protect, authorize } = require('../middleware/auth.middleware');

// Bảo vệ tất cả các route bên dưới
router.use(protect, authorize('admin', 'designer'));

router.route('/')
    .get(fontController.getFonts)
    .post(upload.single('font'), fontController.createFont);

router.post('/bulk-upload', upload.array('fonts', 50), fontController.bulkCreateFonts);

router.route('/:id')
    .delete(fontController.deleteFont);

module.exports = router;