// TrainData/AdminBE/services/font.service.js
const Font = require('../models/font.model');
// Since fonts are not images, you'll need a different service for file deletion.
// For now, I'm commenting out the deletion logic from R2.
// const { deleteFile } = require('./file.service');

const getAllFonts = () => Font.find().sort({ name: 1 });

const createFont = (fontData) => Font.create(fontData);

const deleteFontById = async (id) => {
    const font = await Font.findById(id);
    if (font && font.url) {
        // const fileKey = font.url.split('/').pop();
        // await deleteFile(fileKey);
    }
    await Font.findByIdAndDelete(id);
};

const bulkCreateFonts = async (fontsData) => {
    if (!fontsData || fontsData.length === 0) {
        return [];
    }
    return await Font.insertMany(fontsData, { ordered: false });
};

// === BẮT ĐẦU THÊM MỚI ===
/**
 * Cập nhật thông tin font (ví dụ: tên).
 * @param {string} id - ID của font cần cập nhật.
 * @param {object} updateData - Dữ liệu cần cập nhật.
 * @returns {Promise<Document>}
 */
const updateFontById = (id, updateData) => {
    return Font.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

/**
 * Xóa nhiều font dựa trên danh sách ID.
 * @param {Array<string>} ids - Mảng chứa các ID của font cần xóa.
 * @returns {Promise<object>}
 */
const bulkDeleteFontsByIds = async (ids) => {
    // (Tùy chọn) Nếu bạn muốn xóa file trên R2, bạn cần lặp qua và xóa từng file
    // const fonts = await Font.find({ _id: { $in: ids } });
    // await Promise.all(fonts.map(font => deleteFileFromR2(font.url)));
    return Font.deleteMany({ _id: { $in: ids } });
};
// === KẾT THÚC THÊM MỚI ===
const bulkUpsertFonts = async (fontsData) => {
    const operations = fontsData.map(font => ({
        updateOne: {
            filter: { name: font.name }, // Tìm theo tên
            update: { $set: font },      // Cập nhật thông tin mới (bao gồm URL mới)
            upsert: true                 // Nếu chưa có thì tạo mới
        }
    }));

    if (operations.length > 0) {
        return await Font.bulkWrite(operations);
    }
    return [];
};

const bulkUpdateCategory = async (ids, newCategory) => {
    return Font.updateMany(
        { _id: { $in: ids } },
        { $set: { category: newCategory } }
    );
};

module.exports = {
    getAllFonts,
    createFont,
    deleteFontById,
    bulkCreateFonts,
    updateFontById,       // Export hàm mới
    bulkDeleteFontsByIds, // Export hàm mới
    bulkUpsertFonts,
    bulkUpdateCategory
};