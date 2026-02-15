// AdminBE/controllers/pageCategory.controller.js
const pageCategoryService = require('../services/pageCategory.service');

// 1. Lấy danh sách (Đã có populate parent từ service)
exports.getAllCategories = async (req, res, next) => {
    try {
        const categories = await pageCategoryService.getAllCategories();
        res.status(200).json({ status: 'success', data: categories });
    } catch (error) {
        next(error);
    }
};

// 2. Tạo mới
exports.createCategory = async (req, res, next) => {
    try {
        const newCategory = await pageCategoryService.createCategory(req.body);
        res.status(201).json({ status: 'success', data: newCategory });
    } catch (error) {
        // Xử lý lỗi trùng lặp key (duplicate key error collection)
        if (error.code === 11000) {
            // Check xem trùng tên hay trùng slug để báo lỗi cụ thể hơn
            const field = Object.keys(error.keyValue)[0];
            const message = field === 'slug' 
                ? 'Đường dẫn (Slug) này đã tồn tại.' 
                : 'Tên danh mục này đã tồn tại.';
            return res.status(409).json({ status: 'fail', message });
        }
        next(error);
    }
};

// 3. Cập nhật
exports.updateCategory = async (req, res, next) => {
    try {
        const updatedCategory = await pageCategoryService.updateCategory(req.params.id, req.body);
        
        if (!updatedCategory) {
            return res.status(404).json({ status: 'fail', message: 'Không tìm thấy danh mục' });
        }
        
        res.status(200).json({ status: 'success', data: updatedCategory });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ status: 'fail', message: 'Tên hoặc slug đã tồn tại.' });
        }
        next(error);
    }
};

// 4. Xóa (Đã xử lý logic update con ở service)
exports.deleteCategory = async (req, res, next) => {
    try {
        const category = await pageCategoryService.deleteCategory(req.params.id);
        
        if (!category) {
            return res.status(404).json({ status: 'fail', message: 'Không tìm thấy danh mục để xóa.' });
        }
        
        // Trả về 200 kèm message để FE dễ hiển thị toast success
        res.status(200).json({ status: 'success', message: 'Đã xóa danh mục thành công.' });
    } catch (error) {
        next(error);
    }
};

// 5. Cập nhật thứ tự (Giữ nguyên logic của bạn)
exports.updateCategoryOrder = async (req, res, next) => {
    try {
        const { categories } = req.body; // Lấy categories từ body
        
        // Validate đầu vào
        if (!categories || !Array.isArray(categories)) {
            return res.status(400).json({ status: 'fail', message: 'Dữ liệu categories phải là một mảng.' });
        }

        await pageCategoryService.updateCategoryOrder(categories);
        
        res.status(200).json({ status: 'success', message: 'Thứ tự danh mục được cập nhật thành công.' });
    } catch (error) {
        next(error);
    }
};