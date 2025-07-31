// AdminTrainData/AdminBE/routes/auth.routes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { isAuthenticated } = require('../middleware/isAuthenticated'); // Giả định middleware này kiểm tra token đã có

// Các route này sẽ được gắn vào `/api/v1/admin/auth`
router.post('/login', authController.login);
router.post('/register', authController.register); // Nếu có
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

// Logout cần được bảo vệ để biết ai đang logout
router.post('/logout', isAuthenticated, authController.logout);

module.exports = router;