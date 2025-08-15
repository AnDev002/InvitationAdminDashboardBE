// AdminBE/routes/admin.routes.js

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');

// Import controllers
const adminController = require('../controllers/admin.controller');
const productController = require('../controllers/product.controller');
const templateController = require('../controllers/invitationTemplate.controller');
const userController = require('../controllers/user.controller');
const pageRoutes = require('./page.routes');
const designAssetRoutes = require('./designAsset.routes');
const { upload, resizeImage, uploadImageToR2 } = require('../middleware/upload.middleware');
const { validateProduct } = require('../utils/validators');


router.use(protect);

router.get('/users/me', userController.getMe);
// ===== BẢO VỆ TẤT CẢ CÁC ROUTE BÊN DƯỚI =====
router.get('/dashboard', adminController.getDashboardData);
// === User ===
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
router.get('/templates', authorize('admin', 'marketing', 'designer'), templateController.getInvitationTemplates);
router.get('/templates/categories', authorize('admin', 'marketing', 'designer'), templateController.getTemplateCategories);
router.get('/templates/types', authorize('admin', 'marketing', 'designer'), templateController.getTemplateTypesForCategory);
router.get('/templates/groups', authorize('admin', 'marketing', 'designer'), templateController.getTemplateGroups);
router.post('/templates/bulk-import', authorize('admin', 'marketing', 'designer'), templateController.bulkCreateTemplates);
router.post('/templates', authorize('admin', 'marketing', 'designer'), upload.single('image'), resizeImage, uploadImageToR2, templateController.createTemplate);
router.post('/templates/reorder', authorize('admin', 'marketing', 'designer'), templateController.reorderTemplates);

router.get('/templates/:id', authorize('admin', 'designer'), templateController.getTemplateById);
router.put('/templates/:id', authorize('admin', 'designer'), upload.single('image'), resizeImage, uploadImageToR2, templateController.updateTemplate);
router.delete('/templates/:id', authorize('admin', 'designer'), templateController.deleteTemplate);

// --- Quản lý Trang ---
router.use('/pages', authorize('admin', 'marketing'), pageRoutes);

// === Settings & SEO ===
router.get('/settings', authorize('admin', 'marketing'), adminController.getSettings);
router.put('/settings', authorize('admin', 'marketing'), upload.any(), adminController.updateSettings);

// ++ ROUTES MỚI CHO QUẢN LÝ DANH MỤC VÀ ĐIỀU HƯỚNG ++

// Quản lý Danh mục, Nhóm, Loại của Thiệp mời
router.route('/taxonomies')
    .get(authorize('admin', 'marketing'), adminController.getInvitationTaxonomies)
    .put(authorize('admin', 'marketing'), adminController.updateInvitationTaxonomy); // Dùng để đổi tên

router.post('/taxonomies/add', authorize('admin', 'marketing'), adminController.addInvitationTaxonomy); // THÊM MỚI
router.post('/taxonomies/delete', authorize('admin', 'marketing'), adminController.deleteInvitationTaxonomy);
router.put('/taxonomies/reorder-groups', authorize('admin', 'marketing'), adminController.updateGroupOrder);

// Quản lý Điều hướng (Header Menu)
router.route('/navigation')
    .get(authorize('admin', 'marketing'), adminController.getNavigation)
    .put(authorize('admin', 'marketing'), adminController.updateNavigation);



module.exports = router;