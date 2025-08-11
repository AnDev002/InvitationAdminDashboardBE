// AdminTrainData/AdminBE/routes/designAsset.routes.js

const express = require('express');
const router = express.Router();
const { getDesignAssets, createDesignAsset, deleteDesignAsset, seedInitialAssets, bulkCreateAssets } = require('../controllers/designAsset.controller');
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

// ++ BẮT ĐẦU THÊM MỚI ++
// Route để xử lý upload hàng loạt
router.post(
    '/bulk-import',
    protect,
    authorize('admin'),
    upload.array('images', 50), // Cho phép tải lên tối đa 50 ảnh cùng lúc
    bulkCreateAssets
);
// ++ KẾT THÚC THÊM MỚI ++

router.delete('/:id', protect, authorize('admin'), deleteDesignAsset);

router.post('/seed', seedInitialAssets);

module.exports = router;