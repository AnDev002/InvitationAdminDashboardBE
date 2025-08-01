const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload, resizeImage, uploadImageToR2 } = require('../middleware/upload.middleware');
const {
    validatePasswordChange 
} = require('../utils/validators');

router.get('/', protect, authorize('admin'), userController.getUsers);
router.get('/me', protect, userController.getMe);
router.put('/me', protect, userController.updateMe);
router.put('/me/change-password', protect, validatePasswordChange, userController.changePassword);
router.put('/me/avatar', protect, upload.single('avatar'), resizeImage, uploadImageToR2, userController.updateAvatar);
router.get('/:id', protect, authorize('admin'), userController.getUser);

// Cập nhật thông tin người dùng (yêu cầu đăng nhập và là admin)
router.put('/:id', protect, authorize('admin'), userController.updateUser);

// Xóa người dùng (yêu cầu đăng nhập và là admin)
router.delete('/:id', protect, authorize('admin'), userController.deleteUser);

module.exports = router;