const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');

// Import controllers
const adminController = require('../controllers/admin.controller');
const productController = require('../controllers/product.controller');
const templateController = require('../controllers/invitationTemplate.controller');
const userController = require('../controllers/user.controller');

// TẤT CẢ các route trong backend này đều yêu cầu đăng nhập VÀ phải là admin
router.use(protect);
router.use(authorize('admin'));

// === Dashboard ===
router.get('/dashboard', adminController.getDashboardData);

// === Product Management ===
router.route('/products')
    .get(productController.getProducts)
    .post(/* middleware upload */ productController.createProduct);
router.route('/products/:id')
    .get(productController.getProductById)
    .put(/* middleware upload */ productController.updateProduct)
    .delete(productController.deleteProduct);

// === Template Management ===
router.route('/templates')
    .get(templateController.getInvitationTemplates);
    // .post(templateController.createTemplate); // Thêm các route cần thiết
router.route('/templates/:id')
    .get(templateController.getTemplateById);

// === User Management ===
router.get('/users', userController.getUsers);
router.get('/users/:id', userController.getUser);

// === Settings & SEO ===
router.route('/settings')
    .get(adminController.getSettings)
    .put(adminController.updateSettings);

module.exports = router;