// AdminTrainData/AdminBE/routes/designAsset.routes.js

const express = require('express');
const router = express.Router();
const { getDesignAssets, createDesignAsset, deleteDesignAsset, seedInitialAssets, bulkCreateAssets, bulkDeleteAssets } = require('../controllers/designAsset.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload, resizeImage, uploadImageToCloudflare } = require('../middleware/upload.middleware');

router.get('/', getDesignAssets);

router.post(
    '/', 
    protect, 
    authorize('admin'), 
    upload.single('image'), 
    resizeImage, 
    uploadImageToCloudflare,
    createDesignAsset 
);

// Route để xử lý upload hàng loạt
router.post(
    '/bulk-import',
    protect,
    authorize('admin'),
    upload.array('images', 350), // Cho phép tải lên tối đa 50 ảnh cùng lúc
    bulkCreateAssets
);

router.delete(
    '/bulk-delete',
    protect,
    authorize('admin'),
    bulkDeleteAssets
);

router.delete('/:id', protect, authorize('admin'), deleteDesignAsset);
router.post('/seed', seedInitialAssets);

module.exports = router;