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