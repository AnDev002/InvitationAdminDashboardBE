// TrainData/AdminBE/services/page.service.js
const Page = require('../models/page.model');

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