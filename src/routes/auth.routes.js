const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateUser, validateLogin } = require('../utils/validators');
const { isAuthenticated } = require('../middleware/isAuthenticated');
const passport = require('passport');
const jwt = require('jsonwebtoken');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Route callback sau khi Google xác thực xong
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/sign-in', session: false }),
  (req, res) => {
    // Sau khi xác thực thành công, req.user sẽ chứa thông tin user
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None', // Sử dụng 'Lax' cho redirect
        maxAge: 3600000,
        path: '/'
    });
    // Chuyển hướng về trang chủ của frontend
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
  }
);

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

// Route callback sau khi Facebook xác thực xong
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/sign-in', session: false }),
  (req, res) => {
    // Logic xử lý tương tự như Google
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
        maxAge: 3600000,
        path: '/'
    });
    // Chuyển hướng về trang chủ của frontend
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
  }
);

// POST /api/auth/register
router.post('/register', validateUser, authController.register);

// POST /api/auth/login
router.post('/login', validateLogin, authController.login);
router.post('/logout', isAuthenticated, authController.logout);
router.post('/forgot-password', authController.forgotPassword);

router.patch('/reset-password/:token', authController.resetPassword);

module.exports = router;