const adminService = require('../services/admin.service');

// Controller để lấy cài đặt công khai
exports.getPublicSettings = async (req, res, next) => {
    try {
        const settings = await adminService.getSettings();
        // Lọc bớt các thông tin không cần thiết trước khi gửi ra ngoài
        const publicSettings = {
            headerNav: settings.headerNav,
            theme: settings.theme,
            footer: settings.footer,
        };
        res.status(200).json({
            status: 'success',
            data: publicSettings
        });
    } catch (error) {
        next(error);
    }
};