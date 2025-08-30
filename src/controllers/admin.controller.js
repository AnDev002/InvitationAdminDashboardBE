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
        // Dữ liệu settings được gửi dưới dạng chuỗi JSON trong field 'settings'
        const settingsData = JSON.parse(req.body.settings || '{}');

        if (req.files && req.files.length > 0) {
            const fileUrlMap = new Map();
            const uploadPromises = req.files.map(async (file) => {
                let fileBuffer = file.buffer;
                let fileMimeType = file.mimetype;

                // Tối ưu hóa ảnh trước khi upload
                if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/gif') {
                    fileBuffer = await sharp(file.buffer)
                        .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 85 })
                        .toBuffer();
                    fileMimeType = 'image/webp';
                }

                const { url } = await uploadFileToR2(fileBuffer, fileMimeType);
                // `file.fieldname` sẽ có dạng `banners__0__imageUrl` hoặc `theme__logoUrl`
                fileUrlMap.set(file.fieldname, url);
            });
            await Promise.all(uploadPromises);

            // Gán URL đã upload vào đúng vị trí trong object settingsData
            // 1. Cập nhật cho banners
            if (Array.isArray(settingsData.banners)) {
                settingsData.banners.forEach((banner, index) => {
                    // Tìm file tương ứng với banner này
                    const fieldName = `banners__${index}__imageUrl`;
                    if (fileUrlMap.has(fieldName)) {
                        banner.imageUrl = fileUrlMap.get(fieldName);
                    }
                });
            }

            // 2. Cập nhật cho các trường ảnh khác (logo, social icons...)
            for (const [fieldName, url] of fileUrlMap.entries()) {
                // Bỏ qua các file banner đã xử lý ở trên
                if (!fieldName.startsWith('banners__')) {
                    // Chuyển đổi `theme__logoUrl` thành `theme.logoUrl` để lodash set giá trị
                    const path = fieldName.replace(/__/g, '.');
                    _.set(settingsData, path, url);
                }
            }
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
