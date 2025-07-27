const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');

// Import controllers
const adminController = require('../controllers/admin.controller');
const productController = require('../controllers/product.controller');
const templateController = require('../controllers/invitationTemplate.controller');
const userController = require('../controllers/user.controller');
// Import middleware upload nếu cần
// const { upload } = require('../middleware/upload.middleware');

// Tất cả các route trong file này đều yêu cầu đăng nhập VÀ phải là admin
router.use(protect);
router.use(authorize('admin'));

// === Dashboard ===
router.get('/dashboard', adminController.getDashboardData);

// === Product Management ===
router.get('/products', productController.getProducts);
router.post('/products', /* upload.single('imgSrc'), */ productController.createProduct);
router.put('/products/:id', /* upload.single('imgSrc'), */ productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// === Template Management ===
router.get('/templates', templateController.getInvitationTemplates);
// Thêm các route POST, PUT, DELETE cho Template nếu cần

// === User Management ===
router.get('/users', userController.getUsers);
router.get('/users/:id', userController.getUser);

// === Settings & SEO ===
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;