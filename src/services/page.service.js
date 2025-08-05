// TrainData/AdminBE/services/page.service.js
const Page = require('../models/page.model');

// Các hàm này giờ đây sẽ nhận và lưu trữ 'pageData' với trường 'content' là một mảng.
// Mongoose sẽ tự động xử lý việc lưu trữ cấu trúc mảng này.
// Không cần thay đổi gì ở đây.

const getAllPages = () => Page.find().sort({ createdAt: -1 });
const getPageById = (id) => Page.findById(id);
const getPageBySlug = (slug) => Page.findOne({ slug, isPublished: true });
const createPage = (pageData) => Page.create(pageData);
const updatePage = (id, pageData) => Page.findByIdAndUpdate(id, pageData, { new: true, runValidators: true });
const deletePage = (id) => Page.findByIdAndDelete(id);

module.exports = {
    getAllPages,
    getPageById,
    getPageBySlug,
    createPage,
    updatePage,
    deletePage,
};