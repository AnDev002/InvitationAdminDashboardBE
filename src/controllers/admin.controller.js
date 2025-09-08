// AdminBE/controllers/admin.controller.js

const adminService = require('../services/admin.service');
const _ = require('lodash');
const sharp = require('sharp');
const { uploadFileToCloudflare } = require('../services/cloudflare.service.js');

exports.getDashboardData = async (req, res, next) => {
    try {
        const { startDate, endDate, role, category } = req.query;
        const data = await adminService.getDashboardData({ startDate, endDate, role, category });
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

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
            const fileUrlMap = new Map();
            const uploadPromises = req.files.map(async (file) => {
                let fileBuffer = file.buffer;
                let finalUrl = '';
                
                // === START: MODIFICATION ===
                // Phân biệt xử lý cho video và ảnh
                if (file.mimetype.startsWith('video/')) {
                    // Đối với video, upload trực tiếp không qua sharp
                    const { url } = await uploadFileToCloudflare(fileBuffer);
                    finalUrl = url;
                } else if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/gif') {
                    // Đối với ảnh, xử lý bằng sharp
                    fileBuffer = await sharp(file.buffer)
                        .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 85 })
                        .toBuffer();
                    const { url } = await uploadFileToCloudflare(fileBuffer);
                    finalUrl = url;
                } else {
                    // Giữ nguyên cho các loại file khác (SVG, GIF...)
                    const { url } = await uploadFileToCloudflare(fileBuffer);
                    finalUrl = url;
                }
                // === END: MODIFICATION ===

                fileUrlMap.set(file.fieldname, finalUrl);
            });
            await Promise.all(uploadPromises);
            
            if (Array.isArray(settingsData.banners)) {
                settingsData.banners.forEach((banner, index) => {
                    // === START: MODIFICATION ===
                    // Xác định đúng fieldname dựa trên mediaType
                    const isVideo = banner.mediaType === 'video';
                    const fieldName = isVideo 
                        ? `banners__${index}__videoUrl` 
                        : `banners__${index}__imageUrl`;

                    if (fileUrlMap.has(fieldName)) {
                        if (isVideo) {
                            banner.videoUrl = fileUrlMap.get(fieldName);
                            banner.imageUrl = ''; // Xóa ảnh cũ nếu chuyển sang video
                        } else {
                            banner.imageUrl = fileUrlMap.get(fieldName);
                            banner.videoUrl = ''; // Xóa video cũ nếu chuyển sang ảnh
                        }
                    }
                    // === END: MODIFICATION ===
                });
            }

            for (const [fieldName, url] of fileUrlMap.entries()) {
                if (!fieldName.startsWith('banners__')) {
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