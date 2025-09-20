// AdminBE/routes/font.routes.js
const express = require('express');
const router = express.Router();
const fontController = require('../controllers/font.controller');
const { upload } = require('../middleware/upload.middleware');

router.use(protect, authorize('admin', 'designer'));
router.get('/', fontController.getPublicFonts);
router.route('/')
    .get(fontController.getFonts)
    .post(upload.single('font'), fontController.createFont);

router.post('/bulk-upload', upload.array('fonts'), fontController.bulkCreateFonts);
router.delete('/bulk-delete', fontController.bulkDeleteFonts);

router.route('/:id')
    .put(fontController.updateFont)    
    .delete(fontController.deleteFont);

module.exports = router;