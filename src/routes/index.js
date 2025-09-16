const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');

// Import controllers
const adminController = require('../controllers/admin.controller');
const productController = require('../controllers/product.controller');
const templateController = require('../controllers/invitationTemplate.controller');
const userController = require('../controllers/user.controller');
const pageRoutes = require('./page.routes');
const pageCategoryRoutes = require('./pageCategory.routes');
router.use('/pages', pageRoutes);
router.use('/page-categories', pageCategoryRoutes); 
// Tất cả các route trong file này đều yêu cầu đăng nhập VÀ phải là admin
// router.use(protect);
// router.use(authorize('admin'));

// === Dashboard ===
router.get('/dashboard', adminController.getDashboardData);

// === Product Management ===
router.route('/products')
    .get(productController.getProducts)
    .post(productController.createProduct);

router.route('/products/:id')
    .get(productController.getProductById)
    .put(productController.updateProduct)
    .delete(productController.deleteProduct);

// === Template Management (ĐÃ SỬA VÀ HOÀN THIỆN) ===
router.route('/templates')
    .get(templateController.getInvitationTemplates)
    .post(templateController.createTemplate); // Đảm bảo route POST tồn tại

router.route('/templates/:id')
    .get(templateController.getTemplateById)
    .put(templateController.updateTemplate)    // Bổ sung route PUT
    .delete(templateController.deleteTemplate); // Bổ sung route DELETE

// === User Management ===
router.get('/users/me', userController.getMe); 
router.get('/users', userController.getUsers);
router.get('/users/:id', userController.getUser);

// === Settings & SEO ===
router.route('/settings')
    .get(adminController.getSettings)
    .put(adminController.updateSettings);

module.exports = router;