// AdminBE/routes/font.routes.js
const express = require('express');
const router = express.Router();
const fontController = require('../controllers/font.controller');
const { upload } = require('../middleware/upload.middleware');

router.route('/')
    .get(fontController.getFonts)
    .post(upload.single('font'), fontController.createFont);

router.post('/bulk-upload', upload.array('fonts', 350), fontController.bulkCreateFonts);
router.delete('/bulk-delete', fontController.bulkDeleteFonts);
router.put('/bulk-category', fontController.bulkUpdateCategory);
router.route('/:id')
    .put(fontController.updateFont)    
    .delete(fontController.deleteFont);

module.exports = router;