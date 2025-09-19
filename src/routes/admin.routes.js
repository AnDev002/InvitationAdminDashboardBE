// AdminTrainData/AdminBE/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { handleBatchUpload } = require('../controllers/asset.controller');

// Import controllers
const adminController = require('../controllers/admin.controller');
const productController = require('../controllers/product.controller');
const templateController = require('../controllers/invitationTemplate.controller');
const userController = require('../controllers/user.controller');
// Import page routes
const pageRoutes = require('./page.routes'); 
const fontRoutes = require('./font.routes');
const designAssetRoutes = require('./designAsset.routes');

const pageCategoryRoutes = require('./pageCategory.routes');
const topicRoutes = require('./topic.routes');

const { upload, resizeImage, uploadImageToCloudflare } = require('../middleware/upload.middleware');
const { validateProduct } = require('../utils/validators');


router.use(protect);

router.get('/users/me', userController.getMe);
// ===== BẢO VỆ TẤT CẢ CÁC ROUTE BÊN DƯỚI =====
// Tất cả các route trong file này đều yêu cầu đăng nhập VÀ phải là admin
// router.use(authorize('admin'));
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
        uploadImageToCloudflare,
        validateProduct,
        productController.createProduct
    );

router.route('/products/:id')
    .put(
        authorize('admin', 'designer'),
        productUpload,
        resizeImage,
        uploadImageToCloudflare,
        validateProduct,
        productController.updateProduct
    )
    .delete(authorize('admin', 'designer'), productController.deleteProduct);


// === Template Management ===
router.get('/templates', authorize('admin', 'marketing', 'designer'), templateController.getInvitationTemplates);
router.get('/templates/categories', authorize('admin', 'marketing', 'designer'), templateController.getTemplateCategories);
router.get('/templates/types', authorize('admin', 'marketing', 'designer'), templateController.getTemplateTypesForCategory);
router.get('/templates/groups', authorize('admin', 'marketing', 'designer'), templateController.getTemplateGroups); // Route này phải nằm ở đây
router.post('/templates/bulk-import', 
    authorize('admin', 'marketing', 'designer'), 
    upload.single('file'), // Thêm middleware xử lý file tại đây
    templateController.bulkCreateTemplates
);
router.post('/templates', authorize('admin', 'marketing', 'designer'), upload.any(), templateController.createTemplate);
router.post('/templates/reorder', authorize('admin', 'marketing', 'designer'), templateController.reorderTemplates);
router.delete('/templates/bulk-delete-by-filter', authorize('admin', 'designer'), templateController.bulkDeleteTemplatesByFilter);
router.post('/assets/upload-batch', authorize('admin', 'designer'), upload.any(), handleBatchUpload);

// ROUTE ĐỘNG (KHÁI QUÁT) ĐƯỢC ĐẶT Ở SAU CÙNG
router.get('/templates/:id', authorize('admin', 'designer'), templateController.getTemplateById); // Route này phải nằm sau các route tĩnh ở trên
router.put('/templates/:id', authorize('admin', 'designer'), upload.any(), resizeImage, uploadImageToCloudflare, templateController.updateTemplate);
router.delete('/templates/:id', authorize('admin', 'designer'), templateController.deleteTemplate);

// --- Gắn các route quản lý trang vào đây ---
router.use('/pages', authorize('admin', 'marketing'), pageRoutes);
router.use('/topics', authorize('admin', 'marketing'), topicRoutes);
router.use('/fonts', authorize('admin', 'designer'), fontRoutes);

// === BẮT ĐẦU SỬA LỖI: GẮN ROUTE CHO PAGE CATEGORY ===
// Route này sẽ xử lý các request tới /api/v1/admin/page-categories
router.use('/page-categories', authorize('admin', 'marketing'), pageCategoryRoutes);
// === KẾT THÚC SỬA LỖI ===

// === Settings & SEO ===
router.get('/settings', authorize('admin', 'marketing'), adminController.getSettings);
router.put('/settings', authorize('admin', 'marketing'), upload.any(), adminController.updateSettings);


module.exports = router;