// AdminTrainData/AdminBE/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');

// Import controllers
const adminController = require('../controllers/admin.controller');
const productController = require('../controllers/product.controller');
const templateController = require('../controllers/invitationTemplate.controller');
const userController = require('../controllers/user.controller');
const { upload, resizeImage, uploadImageToR2 } = require('../middleware/upload.middleware');

// ===== BẢO VỆ TẤT CẢ CÁC ROUTE BÊN DƯỚI =====
// Tất cả các route trong file này đều yêu cầu đăng nhập VÀ phải là admin
router.use(protect);
router.use(authorize('admin'));


// === Dashboard ===
router.get('/dashboard', adminController.getDashboardData);

// === User (cho admin xem và thông tin cá nhân của admin) ===
router.get('/users', userController.getUsers);
router.get('/users/me', userController.getMe);
router.get('/users/:id', userController.getUser);

// === Product Management ===
router.get('/products', productController.getProducts);
router.post('/products', productController.createProduct); // Thêm các middleware upload nếu cần
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// === Template Management ===
router.get('/templates', templateController.getInvitationTemplates);
router.get('/templates/categories', templateController.getTemplateCategories);
router.post('/templates', upload.single('image'), resizeImage, uploadImageToR2, templateController.createTemplate);
router.get('/templates/:id', templateController.getTemplateById);
router.put('/templates/:id', upload.single('image'), resizeImage, uploadImageToR2, templateController.updateTemplate);
router.delete('/templates/:id', templateController.deleteTemplate);
router.post('/templates/bulk-import', templateController.bulkCreateTemplates); // <-- THÊM ROUTE MỚI

// === Settings & SEO ===
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;