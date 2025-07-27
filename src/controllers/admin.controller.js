// Import service mới
const adminService = require('../services/admin.service');

// Dashboard
exports.getDashboardData = async (req, res, next) => {
    try {
        const data = await adminService.getDashboardData();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// Settings
exports.getSettings = async (req, res, next) => {
    try {
        const settings = await adminService.getSettings();
        res.status(200).json(settings);
    } catch (error) {
        next(error);
    }
};

exports.updateSettings = async (req, res, next) => {
    try {
        const updatedSettings = await adminService.updateSettings(req.body);
        res.status(200).json({
            message: "Cài đặt đã được cập nhật thành công.",
            data: updatedSettings
        });
    } catch (error) {
        next(error);
    }
};

// ... (các import khác)

exports.adminLogin = (req, res, next) => {
    const { username, password } = req.body;

    // Hardcode tài khoản ở đây
    const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'password123';

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        // Tạo một đối tượng user giả lập
        const adminUser = {
            id: 'admin',
            username: ADMIN_USER,
            role: 'admin'
        };

        // Tạo JWT token (giống như hàm login bình thường)
        const token = jwt.sign({ id: adminUser.id, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

        // Gửi cookie và thông tin user về cho frontend
        res.cookie('admin_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' })
           .status(200)
           .json({ message: "Đăng nhập admin thành công!", user: adminUser });

    } else {
        return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }
};