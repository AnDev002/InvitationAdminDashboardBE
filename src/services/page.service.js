// AdminBE/services/page.service.js

// SỬA Ở ĐÂY: Dùng { Page, PageCategory } để lấy đúng model
const { Page, PageCategory } = require('../models/page.model');

// --- Dịch vụ cho Page ---
const getAllPages = async (query = {}) => {
    const filter = { ...query };
    
    // Xóa key 'category' khỏi filter ban đầu để xử lý riêng
    if (filter.category) {
        delete filter.category;
    }

    if (query.category) {
        const category = await PageCategory.findOne({ slug: query.category });
        if (category) {
            filter.category = category._id;
        } else {
            return []; // Không tìm thấy category, trả về mảng rỗng
        }
    }
    // Giờ Page.find sẽ hoạt động
    return Page.find(filter).sort({ createdAt: -1 });
};

const getPageById = (id) => Page.findById(id);
const getPageBySlug = (slug) => Page.findOne({ slug, isPublished: true });
const createPage = (pageData) => Page.create(pageData);
const updatePage = (id, pageData) => Page.findByIdAndUpdate(id, pageData, { new: true, runValidators: true });
const deletePage = (id) => Page.findByIdAndDelete(id);

// --- Dịch vụ cho PageCategory ---
const getAllPageCategories = () => PageCategory.find().sort({ name: 1 });
const getPageCategoryById = (id) => PageCategory.findById(id);
const createPageCategory = (categoryData) => PageCategory.create(categoryData);
const updatePageCategory = (id, categoryData) => PageCategory.findByIdAndUpdate(id, categoryData, { new: true, runValidators: true });
const deletePageCategory = async (id) => {
    await Page.updateMany({ category: id }, { category: null });
    return PageCategory.findByIdAndDelete(id);
};

// SỬA Ở ĐÂY: Đảm bảo export tất cả các hàm
module.exports = {
    getAllPages,
    getPageById,
    getPageBySlug,
    createPage,
    updatePage,
    deletePage,
    // Thêm các hàm của category vào đây
    getAllPageCategories,
    getPageCategoryById,
    createPageCategory,
    updatePageCategory,
    deletePageCategory
};