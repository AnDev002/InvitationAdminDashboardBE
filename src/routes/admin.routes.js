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
const { validateProduct } = require('../utils/validators'); // <-- THÊM DÒNG NÀY

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
    .get(userController.getUsers) // Lấy danh sách users
    .post(userController.createUser); // Thêm user mới

router.route('/users/:id')
    .get(userController.getUser) // Lấy chi tiết user
    .put(userController.updateUser) // Cập nhật user
    .delete(userController.deleteUser); // Xóa user

// === Product Management (PHẦN ĐÃ SỬA LỖI) ===
router.route('/products')
    .get(productController.getProducts)
    .post(
        productUpload, // Xử lý upload 1 ảnh tên 'image'
        resizeImage,            // Resize ảnh
        uploadImageToR2,        // Tải ảnh lên R2
        validateProduct,        // Kiểm tra dữ liệu
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
router.post('/templates/bulk-import', templateController.bulkCreateTemplates); // <-- THÊM ROUTE MỚI

// === Settings & SEO ===
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;