// AdminTrainData/AdminBE/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');

// Import controllers
const adminController = require('../controllers/admin.controller');
const productController = require('../controllers/product.controller');
const templateController = require('../controllers/invitationTemplate.controller');
const userController = require('../controllers/user.controller');
// --- THÊM MỚI: Import page routes ---
const pageRoutes = require('./page.routes'); 
const { upload, resizeImage, uploadImageToR2 } = require('../middleware/upload.middleware');
const { validateProduct } = require('../utils/validators');

// ===== BẢO VỆ TẤT CẢ CÁC ROUTE BÊN DƯỚI =====
// Tất cả các route trong file này đều yêu cầu đăng nhập VÀ phải là admin
router.use(protect);
router.use(authorize('admin'));


const productUpload = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 }
]);
// === Dashboard ===
router.get('/dashboard', adminController.getDashboardData);

// === User (cho admin xem và thông tin cá nhân của admin) ===
router.get('/users/me', userController.getMe);

router.route('/users')
    .get(userController.getUsers)
    .post(userController.createUser);

router.route('/users/:id')
    .get(userController.getUser)
    .put(userController.updateUser)
    .delete(userController.deleteUser);

// === Product Management ===
router.route('/products')
    .get(productController.getProducts)
    .post(
        productUpload,
        resizeImage,
        uploadImageToR2,
        validateProduct,
        productController.createProduct
    );

router.route('/products/:id')
    .put(
        productUpload,
        resizeImage,
        uploadImageToR2,
        validateProduct,
        productController.updateProduct
    )
    .delete(productController.deleteProduct);


// === Template Management ===
router.get('/templates', templateController.getInvitationTemplates);
router.get('/templates/categories', templateController.getTemplateCategories);
router.post('/templates', upload.single('image'), resizeImage, uploadImageToR2, templateController.createTemplate);
router.get('/templates/:id', templateController.getTemplateById);
router.put('/templates/:id', upload.single('image'), resizeImage, uploadImageToR2, templateController.updateTemplate);
router.delete('/templates/:id', templateController.deleteTemplate);
router.post('/templates/bulk-import', templateController.bulkCreateTemplates);

// --- THÊM MỚI: Gắn các route quản lý trang vào đây ---
router.use('/pages', pageRoutes);

// === Settings & SEO ===
router.get('/settings', adminController.getSettings);
router.put('/settings', upload.any(), adminController.updateSettings);

module.exports = router;