// AdminBE/controllers/admin.controller.js

const adminService = require('../services/admin.service');
const _ = require('lodash');
const sharp = require('sharp');
const { uploadFileToCloudflare } = require('../services/cloudflare.service.js');
const { uploadFileToR2 } = require('../services/r2.service.js'); // Import R2 service

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
                let finalUrl = '';
                
                // === START: MODIFICATION ===
                if (file.mimetype.startsWith('video/')) {
                    // 1. Video được tải lên R2
                    const { url } = await uploadFileToR2(file.buffer, file.mimetype, file.originalname);
                    finalUrl = url;
                
                } else if (file.mimetype.startsWith('font/') || file.mimetype === 'application/octet-stream') {
                    // 2. Font (hoặc file nhị phân) được tải lên R2
                    const { url } = await uploadFileToR2(file.buffer, file.mimetype, file.originalname);
                    finalUrl = url;

                } else if (file.mimetype.startsWith('image/')) {
                    // 3. TẤT CẢ các loại ảnh (JPG, PNG, GIF, SVG) đi qua Cloudflare Images
                    
                    // Chỉ xử lý (resize, webp) các ảnh không phải GIF/SVG
                    if (file.mimetype !== 'image/gif' && file.mimetype !== 'image/svg+xml') {
                        const fileBuffer = await sharp(file.buffer)
                            .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                            .webp({ quality: 85 })
                            .toBuffer();
                        
                        // Gửi buffer đã xử lý và contentType mới ('image/webp')
                        const { url } = await uploadFileToCloudflare(fileBuffer, 'image/webp');
                        finalUrl = url;
                    } else {
                        // Giữ nguyên GIF và SVG, tải trực tiếp lên Cloudflare Images
                        const { url } = await uploadFileToCloudflare(file.buffer, file.mimetype);
                        finalUrl = url;
                    }
                } else {
                     // 4. Các loại file khác (nếu có) mặc định lên R2
                    const { url } = await uploadFileToR2(file.buffer, file.mimetype, file.originalname);
                    finalUrl = url;
                }
                // === END: MODIFICATION ===

                fileUrlMap.set(file.fieldname, finalUrl);
            });
            await Promise.all(uploadPromises);
            
            if (Array.isArray(settingsData.banners)) {
                settingsData.banners.forEach((banner, index) => {
                    const isVideo = banner.mediaType === 'video';
                    const fieldName = isVideo 
                        ? `banners__${index}__videoUrl` 
                        : `banners__${index}__imageUrl`;

                    if (fileUrlMap.has(fieldName)) {
                        if (isVideo) {
                            banner.videoUrl = fileUrlMap.get(fieldName);
                            banner.imageUrl = '';
                        } else {
                            banner.imageUrl = fileUrlMap.get(fieldName);
                            banner.videoUrl = '';
                        }
                    }
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