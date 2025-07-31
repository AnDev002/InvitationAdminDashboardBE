// AdminTrainData/AdminBE/controllers/auth.controller.js

const userService = require('../services/user.service');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// ... (Các hàm forgotPassword và resetPassword giữ nguyên)
const forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng với email này.' });
        }

        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetURL = `${frontendUrl}/reset-password/${resetToken}`;

        const message = `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\nVui lòng nhấn vào liên kết sau hoặc dán vào trình duyệt để hoàn tất quá trình (liên kết có hiệu lực trong 10 phút):\n\n${resetURL}\n\nNếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.`;

        try {
            const mailOptions = {
                to: user.email,
                subject: 'Yêu cầu đặt lại mật khẩu',
                text: message,
            };
            
            await sendEmail(mailOptions);

            res.status(200).json({
                status: 'success',
                message: 'Link đặt lại mật khẩu đã được gửi đến email!',
            });
        } catch (err) {
            console.error('EMAIL SENDING ERROR:', err);
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ message: 'Gửi email thất bại. Vui lòng thử lại sau.' });
        }
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
        }

        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập.',
        });

    } catch (error) {
        next(error);
    }
};


const socialLoginCallback = (req, res) => {
    // Sau khi xác thực thành công qua Passport, req.user sẽ chứa thông tin user
    const token = jwt.sign({ id: req.user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        maxAge: 24 * 60 * 60 * 1000, // 1 ngày
        path: '/'
    });
    // Chuyển hướng về trang dashboard của admin
    res.redirect(process.env.ADMIN_FRONTEND_URL || 'http://localhost:3000/dashboard');
};

const register = async (req, res, next) => {
    const { username, email, password } = req.body;

    try {
        const userExists = await User.findOne({ $or: [{ username }, { email }] });
        if (userExists) {
            if (userExists.username === username) {
                return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại.' });
            }
            if (userExists.email === email) {
                return res.status(409).json({ message: 'Email đã được sử dụng.' });
            }
        }

        const user = await User.create({ username, email, password });

        res.status(201).json({
            message: 'Đăng ký thành công! Vui lòng đăng nhập.',
        });

    } catch (error) {
        next(error);
    }
};
// --- HÀM LOGIN ĐÃ ĐƯỢC TÁI CẤU TRÚC ---
const login = async (req, res, next) => {
  try {
    const { login, password } = req.body; 

    const user = await userService.findUserByUsernameOrEmail(login);

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    user.password = undefined;

    // Thiết lập httpOnly cookie an toàn
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        maxAge: 24 * 60 * 60 * 1000 * 365, // 1 năm
        path: '/'
    });
    
    // ** THAY ĐỔI QUAN TRỌNG: **
    // Chỉ trả về thông tin người dùng, không trả về token trong body
    res.status(200).json({
        message: "Đăng nhập thành công!",
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            role: user.role // Gửi kèm role để frontend có thể kiểm tra
        }
    });

  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  res.clearCookie('token', { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    path: '/'
  })
  .status(200) 
  .json({ message: 'Đăng xuất thành công' });
};


module.exports = { register, login, logout, forgotPassword, resetPassword, socialLoginCallback };