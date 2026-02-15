// AdminBE/services/page.service.js

// === SỬA TẠI ĐÂY: Bỏ dấu { } khi require ===
const Page = require('../models/page.model'); 
const PageCategory = require('../models/pageCategory.model');

// --- Dịch vụ cho Page ---
const getAllPages = (query = {}) => Page.find(query).populate('category').sort({ order: 1 }); 

const getPageById = (id) => Page.findById(id).populate('category');
const getPageBySlug = (slug) => Page.findOne({ slug, isPublished: true }).populate('category');

const createPage = (pageData) => Page.create(pageData);
const updatePage = (id, pageData) => Page.findByIdAndUpdate(id, pageData, { new: true, runValidators: true });
const deletePage = (id) => Page.findByIdAndDelete(id);

const updatePageOrder = (pages) => {
    const promises = pages.map((page, index) => {
        return Page.findByIdAndUpdate(page.id, { order: index });
    });
    return Promise.all(promises);
};

// --- Dịch vụ cho PageCategory ---
const getAllPageCategories = () => PageCategory.find().sort({ name: 1 });
const getPageCategoryById = (id) => PageCategory.findById(id);
const createPageCategory = (categoryData) => PageCategory.create(categoryData);
const updatePageCategory = (id, categoryData) => PageCategory.findByIdAndUpdate(id, categoryData, { new: true, runValidators: true });
const deletePageCategory = async (id) => {
    await Page.updateMany({ category: id }, { category: null });
    return PageCategory.findByIdAndDelete(id);
};

module.exports = {
    getAllPages,
    getPageById,
    getPageBySlug,
    createPage,
    updatePage,
    deletePage,
    updatePageOrder,
    getAllPageCategories,
    getPageCategoryById,
    createPageCategory,
    updatePageCategory,
    deletePageCategory
};