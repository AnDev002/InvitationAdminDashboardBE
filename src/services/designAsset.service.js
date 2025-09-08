// TrainData/AdminBE/services/designAsset.service.js
const DesignAsset = require('../models/designAsset.model');
const { deleteFileFromCloudflare, getImageIdFromUrl } = require('./cloudflare.service.js');

/**
 * Lấy tất cả các tài nguyên thiết kế dựa trên loại của chúng.
 * @param {string} assetType - Loại tài nguyên ('icon', 'component', 'tag').
 * @returns {Promise<Array<Document>>} Mảng các tài nguyên.
 */
const getAssetsByType = async (assetType) => {
    if (!assetType) {
        // Nếu không có type, có thể trả về tất cả hoặc báo lỗi
        // Ở đây ta trả về tất cả và sắp xếp theo loại
        return await DesignAsset.find().sort({ assetType: 1 });
    }
    return await DesignAsset.find({ assetType: assetType });
};

/**
 * [HÀM MỚI]
 * Tạo một tài sản thiết kế mới.
 * @param {object} assetData - Dữ liệu tài sản từ controller.
 * @returns {Promise<Document>}
 */
const createAsset = async (assetData) => {
    return await DesignAsset.create(assetData);
};

/**
 * [HÀM MỚI]
 * Xóa một tài sản thiết kế bằng ID.
 * @param {string} assetId - ID của tài sản cần xóa.
 */
const deleteAssetById = async (assetId) => {
    const asset = await DesignAsset.findById(assetId);
    if (asset && asset.imgSrc) {
        // THAY ĐỔI: Trích xuất ID từ URL và xóa file trên Cloudflare
        const imageId = getImageIdFromUrl(asset.imgSrc);
        if (imageId) {
            await deleteFileFromCloudflare(imageId);
        }
    }
    await DesignAsset.findByIdAndDelete(assetId);
};


// ++ BẮT ĐẦU THÊM MỚI ++
/**
 * [HÀM MỚI]
 * Tạo nhiều tài sản thiết kế cùng lúc.
 * @param {Array<object>} assetsData - Mảng các đối tượng dữ liệu tài sản.
 * @returns {Promise<Array<Document>>}
 */
const bulkCreateAssets = async (assetsData) => {
    if (!assetsData || assetsData.length === 0) {
        return [];
    }
    // insertMany hiệu quả hơn cho việc chèn nhiều document
    return await DesignAsset.insertMany(assetsData);
};
// ++ KẾT THÚC THÊM MỚI ++


// Bạn cũng có thể thêm hàm seed dữ liệu ở đây, tương tự như seedTemplates
const seedAssets = async () => {
    const assets = [
        // Icons
        { assetType: 'icon', name: 'Icon Trái Tim', imgSrc: 'https://placehold.co/150x150/A2D2FF/FFFFFF?text=Heart', category: 'Love' },
        { assetType: 'icon', name: 'Icon Bông Hoa', imgSrc: 'https://placehold.co/150x150/A2D2FF/FFFFFF?text=Flower', category: 'Nature' },
        // Components (họa tiết)
        { assetType: 'component', name: 'Họa tiết hoa văn', imgSrc: 'https://placehold.co/150x150/A2D2FF/FFFFFF?text=Hoa+v%C4%83n' },
        { assetType: 'component', name: 'Dải phân cách', imgSrc: 'https://placehold.co/200x50/BDE0FE/FFFFFF?text=Divider' },
        { assetType: 'component', name: 'Họa tiết Góc', imgSrc: 'https://placehold.co/120x120/FFCDB2/FFFFFF?text=Góc' },
        { assetType: 'component', name: 'Họa tiết Lá', imgSrc: 'https://placehold.co/150x150/CDB4DB/FFFFFF?text=Lá' },
        { assetType: 'component', name: 'Dải ruy băng', imgSrc: 'https://placehold.co/250x60/FFAFCC/FFFFFF?text=Ruy+băng' },
        { assetType: 'component', name: 'Họa tiết hình học', imgSrc: 'https://placehold.co/150x150/BDE0FE/FFFFFF?text=Geo' },
        { assetType: 'component', name: 'Vệt màu nước', imgSrc: 'https://placehold.co/180x120/A2D2FF/FFFFFF?text=Màu+nước' },
        { assetType: 'component', name: 'Chấm bi', imgSrc: 'https://placehold.co/150x150/FBF8CC/FFFFFF?text=Chấm+bi' },
        { assetType: 'component', name: 'Đường kẻ', imgSrc: 'https://placehold.co/200x40/F3C6C6/FFFFFF?text=Kẻ' },
        { assetType: 'component', name: 'Họa tiết ren', imgSrc: 'https://placehold.co/150x150/EAE4E9/FFFFFF?text=Ren' },
        // Tags (khung)
        { assetType: 'tag', name: 'Khung Cổ Điển', imgSrc: 'https://placehold.co/150x150/A2D2FF/FFFFFF?text=Retro', category: 'Vintage' },
        { assetType: 'tag', name: 'Bong bóng trò chuyện', imgSrc: 'https://placehold.co/150x150/A2D2FF/FFFFFF?text=MessageTag', category: 'Nature' },
    ];
    await DesignAsset.deleteMany({});
    await DesignAsset.insertMany(assets);
};
const bulkDeleteAssetsByIds = async (assetIds) => {
    if (!assetIds || assetIds.length === 0) {
        return { deletedCount: 0 };
    }

    const assetsToDelete = await DesignAsset.find({ _id: { $in: assetIds } });
    
    // THAY ĐỔI: Xóa file trên Cloudflare
    const deletePromises = assetsToDelete.map(asset => {
        if (asset.imgSrc) {
            const imageId = getImageIdFromUrl(asset.imgSrc);
            if (imageId) {
                return deleteFileFromCloudflare(imageId);
            }
        }
        return Promise.resolve();
    });

    await Promise.all(deletePromises);

    const result = await DesignAsset.deleteMany({ _id: { $in: assetIds } });
    return result;
};

module.exports = {
    getAssetsByType,
    createAsset, 
    deleteAssetById, 
    seedAssets, // Export để có thể gọi từ một route admin nào đó
    bulkCreateAssets, 
    bulkDeleteAssetsByIds,
};