const designAssetService = require('../services/designAsset.service');
// ++ BẮT ĐẦU THÊM MỚI ++
const { uploadFileToCloudflare } = require('../services/cloudflare.service.js');
const sharp = require('sharp');
// ++ KẾT THÚC THÊM MỚI ++


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

const createDesignAsset = async (req, res, next) => {
    try {
        const { name, assetType, category } = req.body;
        // THAY ĐỔI: Kiểm tra cfUrl
        if (!req.file || !req.file.cfUrl) {
            return res.status(400).json({ message: 'Vui lòng tải lên một file ảnh.' });
        }
        
        const assetData = {
            name,
            assetType,
            category: category || 'General',
            // THAY ĐỔI: Lấy cfUrl
            imgSrc: req.file.cfUrl 
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

// ++ BẮT ĐẦU THÊM MỚI ++
/**
 * [CONTROLLER MỚI]
 * Tạo hàng loạt tài sản thiết kế từ nhiều file ảnh.
 */
const bulkCreateAssets = async (req, res, next) => {
    try {
        const { metadata } = req.body;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'Vui lòng chọn ít nhất một file ảnh.' });
        }

        const parsedMetadata = JSON.parse(metadata);

        const uploadPromises = files.map(async (file, index) => {
            const buffer = await sharp(file.buffer)
                .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
            const { url } = await uploadFileToCloudflare(buffer);
            return {
                ...parsedMetadata[index], // Lấy name, category, assetType từ metadata
                imgSrc: url
            };
        });

        const assetsToCreate = await Promise.all(uploadPromises);

        const newAssets = await designAssetService.bulkCreateAssets(assetsToCreate);

        res.status(201).json({
            status: 'success',
            message: `Đã thêm thành công ${newAssets.length} tài sản.`,
            data: newAssets
        });

    } catch (error) {
        console.error("Lỗi khi tạo hàng loạt tài sản:", error);
        next(error);
    }
};
// ++ KẾT THÚC THÊM MỚI ++

// Controller để seed dữ liệu (chỉ dùng cho mục đích phát triển)
const seedInitialAssets = async (req, res, next) => {
    try {
        await designAssetService.seedAssets();
        res.status(200).json({ message: 'Design assets database seeded successfully!' });
    } catch (error) {
    }
};

const bulkDeleteAssets = async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Vui lòng cung cấp một danh sách ID hợp lệ.' });
        }

        const result = await designAssetService.bulkDeleteAssetsByIds(ids);

        res.status(200).json({
            status: 'success',
            message: `Đã xóa thành công ${result.deletedCount} tài sản.`
        });
    } catch (error) {
        console.error("Lỗi khi xóa hàng loạt tài sản:", error);
        next(error);
    }
};
module.exports = {
    getDesignAssets,
    createDesignAsset,
    deleteDesignAsset, 
    seedInitialAssets,
    bulkCreateAssets,
    bulkDeleteAssets,
};