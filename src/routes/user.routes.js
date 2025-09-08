const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload, resizeImage, uploadImageToCloudflare } = require('../middleware/upload.middleware');
const {
    validatePasswordChange 
} = require('../utils/validators');

router.get('/', protect, authorize('admin'), userController.getUsers);
router.get('/me', protect, userController.getMe);
router.put('/me', protect, userController.updateMe);
router.put('/me/change-password', protect, validatePasswordChange, userController.changePassword);
router.put('/me/avatar', protect, upload.single('avatar'), resizeImage, uploadImageToCloudflare, userController.updateAvatar);
router.get('/:id', protect, authorize('admin'), userController.getUser);
router.put('/:id', protect, authorize('admin'), userController.updateUser);
router.delete('/:id', protect, authorize('admin'), userController.deleteUser);

module.exports = router;