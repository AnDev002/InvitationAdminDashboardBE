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

        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                let fileBuffer = file.buffer;
                let fileMimeType = file.mimetype;

                // === BẮT ĐẦU THAY ĐỔI TẠI ĐÂY ===
                // Chỉ xử lý ảnh nếu nó không phải là GIF
                if (file.mimetype !== 'image/gif') {
                    fileBuffer = await sharp(file.buffer)
                        .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 85 })
                        .toBuffer();
                    fileMimeType = 'image/webp'; // Cập nhật lại mimetype sau khi chuyển đổi
                }
                // === KẾT THÚC THAY ĐỔI ===

                // Tải file (đã xử lý hoặc file GIF gốc) lên R2
                const { url } = await uploadFileToR2(fileBuffer, fileMimeType);
                
                // ++ NÂNG CẤP LOGIC: Xử lý các fieldname phức tạp hơn
                // Ví dụ: 'theme_logoUrl' hoặc 'footer_socialLinks_0_iconSrc'
                const path = file.fieldname.replace(/_/g, '.'); // Chuyển đổi thành 'theme.logoUrl' hoặc 'footer.socialLinks.0.iconSrc'
                
                _.set(settingsData, path, url);
            });

            await Promise.all(uploadPromises);
        }
        
        const updatedSettings = await adminService.updateSettings(settingsData);
        
        res.status(200).json({
            message: "Cài đặt đã được cập nhật thành công.",
            data: updatedSettings
        });
    } catch (error) {
        next(error);
    }
};