const PageCategory = require('../models/pageCategory.model');

const getAllCategories = () => PageCategory.find().sort({ name: 1 });
const getCategoryById = (id) => PageCategory.findById(id);
const createCategory = (categoryData) => PageCategory.create(categoryData);
const updateCategory = (id, categoryData) => PageCategory.findByIdAndUpdate(id, categoryData, { new: true, runValidators: true });
const deleteCategory = (id) => PageCategory.findByIdAndDelete(id);

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
};