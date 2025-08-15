// AdminTrainData/AdminBE/controllers/admin.controller.js

const adminService = require('../services/admin.service');
const _ = require('lodash');
const sharp = require('sharp');
const { uploadFileToR2 } = require('../services/r2.service');

// Dashboard
exports.getDashboardData = async (req, res, next) => {
    try {
        const { startDate, endDate, role, category } = req.query;
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
        // Lấy dữ liệu JSON từ trường 'settings'
        const settingsData = JSON.parse(req.body.settings || '{}');

        // Xử lý các file được tải lên
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                let fileBuffer = file.buffer;
                let fileMimeType = file.mimetype;

                // Tối ưu hóa ảnh (trừ file GIF)
                if (file.mimetype !== 'image/gif') {
                    fileBuffer = await sharp(file.buffer)
                        .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 85 })
                        .toBuffer();
                    fileMimeType = 'image/webp';
                }

                // Tải file lên R2
                const { url } = await uploadFileToR2(fileBuffer, fileMimeType);
                
                // Chuyển đổi fieldname (vd: 'footer_socialLinks_0_icon') thành đường dẫn ('footer.socialLinks[0].icon')
                const path = file.fieldname.replace(/_(\d+)_/g, '[$1].').replace(/_/g, '.');

                // Dùng lodash để gán URL mới vào đúng vị trí trong object settingsData
                _.set(settingsData, path, url);
            });
            await Promise.all(uploadPromises);
        }
        
        // Lưu object settings đã hoàn chỉnh
        const updatedSettings = await adminService.updateSettings(settingsData);
        
        res.status(200).json({
            message: "Cài đặt đã được cập nhật thành công.",
            data: updatedSettings
        });
    } catch (error) {
        next(error);
    }
};