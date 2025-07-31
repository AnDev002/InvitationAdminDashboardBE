const designAssetService = require('../services/designAsset.service');

/**
 * Controller để lấy các tài nguyên thiết kế.
 * Lấy loại tài nguyên từ query string (vd: /api/design-assets?type=icon)
 */
const getDesignAssets = async (req, res, next) => {
    try {
        const { type } = req.query; // Lấy 'type' từ query params
        const assets = await designAssetService.getAssetsByType(type);
        res.status(200).json({
            status: 'success',
            results: assets.length,
            data: assets,
        });
    } catch (error) {
        
    }
};

/**
 * [CONTROLLER MỚI]
 * Tạo một tài sản thiết kế mới.
 */
const createDesignAsset = async (req, res, next) => {
    try {
        const { name, assetType, category } = req.body;
        if (!req.file || !req.file.r2Url) {
            return res.status(400).json({ message: 'Vui lòng tải lên một file ảnh.' });
        }
        
        const assetData = {
            name,
            assetType,
            category: category || 'General',
            imgSrc: req.file.r2Url
        };
        
        const newAsset = await designAssetService.createAsset(assetData);
        res.status(201).json({ status: 'success', data: newAsset });
    } catch (error) {
        next(error);
    }
};

/**
 * [CONTROLLER MỚI]
 * Xóa một tài sản thiết kế.
 */
const deleteDesignAsset = async (req, res, next) => {
    try {
        await designAssetService.deleteAssetById(req.params.id);
        res.status(204).send(); // 204 No Content
    } catch (error) {
        next(error);
    }
};

// Controller để seed dữ liệu (chỉ dùng cho mục đích phát triển)
const seedInitialAssets = async (req, res, next) => {
    try {
        await designAssetService.seedAssets();
        res.status(200).json({ message: 'Design assets database seeded successfully!' });
    } catch (error) {
    }
};

module.exports = {
    getDesignAssets,
    createDesignAsset,
    deleteDesignAsset, 
    seedInitialAssets,
};