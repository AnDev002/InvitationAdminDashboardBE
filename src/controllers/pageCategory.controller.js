const pageCategoryService = require('../services/pageCategory.service');

exports.getAllCategories = async (req, res, next) => {
    try {
        const categories = await pageCategoryService.getAllCategories();
        res.status(200).json({ status: 'success', data: categories });
    } catch (error) {
        next(error);
    }
};

exports.createCategory = async (req, res, next) => {
    try {
        const newCategory = await pageCategoryService.createCategory(req.body);
        res.status(201).json({ status: 'success', data: newCategory });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Lỗi: Tên hoặc slug của danh mục đã tồn tại.' });
        }
        next(error);
    }
};

exports.updateCategory = async (req, res, next) => {
    try {
        const updatedCategory = await pageCategoryService.updateCategory(req.params.id, req.body);
        if (!updatedCategory) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        res.status(200).json({ status: 'success', data: updatedCategory });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Lỗi: Tên hoặc slug của danh mục đã tồn tại.' });
        }
        next(error);
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        const category = await pageCategoryService.deleteCategory(req.params.id);
        if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};


exports.updateCategoryOrder = async (req, res, next) => {
    try {
        await pageCategoryService.updateCategoryOrder(req.body.categories);
        res.status(200).json({ status: 'success', message: 'Thứ tự danh mục được cập nhật thành công.' });
    } catch (error) {
        next(error);
    }
};