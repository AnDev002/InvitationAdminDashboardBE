// Import service mới
const adminService = require('../services/admin.service');
const _ = require('lodash'); // Thư viện tiện ích, đã được dùng trong các file khác
const sharp = require('sharp'); // Thư viện xử lý ảnh
const { uploadFileToR2 } = require('../services/r2.service');

// Dashboard
exports.getDashboardData = async (req, res, next) => {
    try {
        // Lấy các tham số filter từ query string
        const { startDate, endDate, role, category } = req.query;
        // Truyền các filter vào service
        const data = await adminService.getDashboardData({ startDate, endDate, role, category });
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
        const settingsData = JSON.parse(req.body.settings || '{}');

        // Logic xử lý file được tải lên
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                let fileBuffer = file.buffer;
                let fileMimeType = file.mimetype;

                // Tối ưu hóa ảnh nếu không phải là GIF
                if (file.mimetype !== 'image/gif') {
                    fileBuffer = await sharp(file.buffer)
                        .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 85 })
                        .toBuffer();
                    fileMimeType = 'image/webp';
                }

                // Tải file đã xử lý lên R2
                const { url } = await uploadFileToR2(fileBuffer, fileMimeType);
                
                // Chuyển đổi fieldname từ 'theme_logoUrl' thành đường dẫn 'theme.logoUrl'
                const path = file.fieldname.replace(/_/g, '.');
                
                // **ĐIỂM QUAN TRỌNG:** Ghi đè URL mới trực tiếp vào đối tượng settingsData
                // Điều này giúp API tự tin hơn và ít phụ thuộc vào frontend.
                _.set(settingsData, path, url);
            });

            // Chờ tất cả các file được tải lên xong
            await Promise.all(uploadPromises);
        }
        
        // Lưu đối tượng settings đã hoàn chỉnh vào cơ sở dữ liệu
        const updatedSettings = await adminService.updateSettings(settingsData);
        
        res.status(200).json({
            message: "Cài đặt đã được cập nhật thành công.",
            data: updatedSettings
        });
    } catch (error) {
        next(error);
    }
};