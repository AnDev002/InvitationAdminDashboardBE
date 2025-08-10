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
const designAssetRoutes = require('./designAsset.routes');
const { upload, resizeImage, uploadImageToR2 } = require('../middleware/upload.middleware');
const { validateProduct } = require('../utils/validators');


router.use(protect);

router.get('/users/me', userController.getMe);
// ===== BẢO VỆ TẤT CẢ CÁC ROUTE BÊN DƯỚI =====
// Tất cả các route trong file này đều yêu cầu đăng nhập VÀ phải là admin
router.use(authorize('admin'));
// === Dashboard ===
router.get('/dashboard', adminController.getDashboardData);
// === User (cho admin xem và thông tin cá nhân của admin) ===
router.route('/users')
    .get(userController.getUsers)
    .post(userController.createUser);
router.route('/users/:id')
    .get(userController.getUser)
    .put(userController.updateUser)
    .delete(userController.deleteUser);


const productUpload = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 }
]);


// === Product Management ===
router.route('/products')
    .get(authorize('admin', 'designer'), productController.getProducts)
    .post(
        authorize('admin', 'designer'), 
        productUpload,
        resizeImage,
        uploadImageToR2,
        validateProduct,
        productController.createProduct
    );

router.route('/products/:id')
    .put(
        authorize('admin', 'designer'), 
        productUpload,
        resizeImage,
        uploadImageToR2,
        validateProduct,
        productController.updateProduct
    )
    .delete(authorize('admin', 'designer'), productController.deleteProduct);


// === Template Management ===
router.get('/templates', authorize('admin', 'designer'), templateController.getInvitationTemplates);
router.get('/templates/categories', authorize('admin', 'designer'), templateController.getTemplateCategories);
router.get('/templates/types', authorize('admin', 'designer'), templateController.getTemplateTypesForCategory);
router.get('/templates/groups', authorize('admin', 'designer'), templateController.getTemplateGroups); // Route này phải nằm ở đây
router.post('/templates/bulk-import', authorize('admin', 'designer'), templateController.bulkCreateTemplates);
router.post('/templates', authorize('admin', 'designer'), upload.single('image'), resizeImage, uploadImageToR2, templateController.createTemplate);

// ROUTE ĐỘNG (KHÁI QUÁT) ĐƯỢC ĐẶT Ở SAU CÙNG
router.get('/templates/:id', authorize('admin', 'designer'), templateController.getTemplateById); // Route này phải nằm sau các route tĩnh ở trên
router.put('/templates/:id', authorize('admin', 'designer'), upload.single('image'), resizeImage, uploadImageToR2, templateController.updateTemplate);
router.delete('/templates/:id', authorize('admin', 'designer'), templateController.deleteTemplate);

// --- THÊM MỚI: Gắn các route quản lý trang vào đây ---
router.use('/pages', authorize('admin', 'marketing'), upload.any(), pageRoutes);

// === Settings & SEO ===
router.get('/settings', authorize('admin', 'marketing'), adminController.getSettings);
router.put('/settings', authorize('admin', 'marketing'), upload.any(), adminController.updateSettings);

module.exports = router;