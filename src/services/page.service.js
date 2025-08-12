// TrainData/AdminBE/services/page.service.js
const Page = require('../models/page.model');

/**
 * Lấy tất cả các trang từ cơ sở dữ liệu.
 * @returns {Promise<Array>} Danh sách các trang.
 */
exports.getAllPages = async () => {
    // Sắp xếp các trang mới nhất lên đầu
    return await Page.find().sort({ createdAt: -1 });
};

/**
 * Tìm một trang bằng ID.
 * @param {string} id - ID của trang.
 * @returns {Promise<Object|null>} Trang được tìm thấy hoặc null.
 */
exports.getPageById = async (id) => {
    return await Page.findById(id);
};

/**
 * Tìm một trang bằng slug.
 * @param {string} slug - Slug của trang.
 * @returns {Promise<Object|null>} Trang được tìm thấy hoặc null.
 */
exports.getPageBySlug = async (slug) => {
    return await Page.findOne({ slug: slug, isPublished: true });
};

/**
 * Tạo một trang mới.
 * @param {Object} pageData - Dữ liệu của trang mới.
 * @returns {Promise<Object>} Trang vừa được tạo.
 */
exports.createPage = async (pageData) => {
    const page = new Page(pageData);
    return await page.save();
};

/**
 * Cập nhật một trang đã có.
 * @param {string} id - ID của trang cần cập nhật.
 * @param {Object} pageData - Dữ liệu mới cho trang.
 * @returns {Promise<Object|null>} Trang đã được cập nhật hoặc null.
 */
exports.updatePage = async (id, pageData) => {
    return await Page.findByIdAndUpdate(id, pageData, {
        new: true, // Trả về tài liệu đã được cập nhật
        runValidators: true // Chạy các trình xác thực của Mongoose
    });
};

/**
 * Xóa một trang.
 * @param {string} id - ID của trang cần xóa.
 * @returns {Promise<Object|null>} Trang đã bị xóa hoặc null.
 */
exports.deletePage = async (id) => {
    return await Page.findByIdAndDelete(id);
};