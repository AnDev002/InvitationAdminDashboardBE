const PageCategory = require('../models/pageCategory.model');

const getAllCategories = () => PageCategory.find().sort('order');

const getCategoryById = (id) => PageCategory.findById(id);

const createCategory = (categoryData) => PageCategory.create(categoryData);

const updateCategory = (id, categoryData) => PageCategory.findByIdAndUpdate(id, categoryData, { new: true, runValidators: true });

const deleteCategory = (id) => PageCategory.findByIdAndDelete(id);

const updateCategoryOrder = (categories) => {
    const promises = categories.map((cat, index) => {
        // Cập nhật trường 'order' của từng danh mục theo vị trí mới
        return PageCategory.findByIdAndUpdate(cat.id, { order: index });
    });
    return Promise.all(promises);
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    updateCategoryOrder,
};