// AdminBE/routes/pageCategory.routes.js
const express = require('express');
const router = express.Router();
const pageCategoryController = require('../controllers/pageCategory.controller');

// --- 1. Route Sắp xếp (QUAN TRỌNG: Phải đặt trên cùng) ---
// Giữ nguyên method PUT và path /update-order theo code cũ của bạn
router.route('/update-order')
    .put(pageCategoryController.updateCategoryOrder);

// --- 2. Route Gốc (Lấy tất cả / Tạo mới) ---
router.route('/')
    .get(pageCategoryController.getAllCategories)
    .post(pageCategoryController.createCategory);

// --- 3. Route theo ID (Update / Delete) ---
// Giữ nguyên method PUT theo code cũ của bạn
router.route('/:id')
    .put(pageCategoryController.updateCategory)
    .delete(pageCategoryController.deleteCategory);

module.exports = router;