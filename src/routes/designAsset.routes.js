// AdminTrainData/AdminBE/routes/designAsset.routes.js

const express = require('express');
const router = express.Router();
const { getDesignAssets, createDesignAsset, deleteDesignAsset, seedInitialAssets } = require('../controllers/designAsset.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload, resizeImage, uploadImageToR2 } = require('../middleware/upload.middleware');

router.get('/', getDesignAssets);

router.post(
    '/', 
    protect, 
    authorize('admin'), 
    upload.single('image'), 
    resizeImage, 
    uploadImageToR2, 
    createDesignAsset
);

router.delete('/:id', protect, authorize('admin'), deleteDesignAsset);

router.post('/seed', seedInitialAssets);

module.exports = router;