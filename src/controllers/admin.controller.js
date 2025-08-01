// Import service mới
const adminService = require('../services/admin.service');
const _ = require('lodash'); // Thư viện tiện ích, đã được dùng trong các file khác
const sharp = require('sharp'); // Thư viện xử lý ảnh
const { uploadFileToR2 } = require('../services/r2.service');

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
        // Dữ liệu văn bản sẽ được gửi dưới dạng chuỗi JSON trong trường 'settings'
        const settingsData = JSON.parse(req.body.settings || '{}');

        // Xử lý các file đã tải lên (nếu có)
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                // Xử lý ảnh (resize, nén) trước khi upload
                const processedBuffer = await sharp(file.buffer)
                    .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toBuffer();
                
                // Tải file đã xử lý lên R2
                const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
                
                // SỬA LỖI TẠI ĐÂY: Logic tạo đường dẫn đã được sửa lại
                // Tách fieldname thành các phần dựa trên dấu gạch dưới đầu tiên và cuối cùng
                const parts = file.fieldname.split('_');
                const group = parts.shift(); // Lấy phần đầu tiên (ví dụ: 'banners')
                const property = parts.pop(); // Lấy phần cuối cùng (ví dụ: 'imageUrl')
                const key = parts.join('_'); // Nối các phần còn lại để tạo khóa (ví dụ: 'home_secondary_1')

                const path = `${group}.${key}.${property}`; // Tạo đường dẫn chính xác: 'banners.home_secondary_1.imageUrl'
                
                // Sử dụng lodash để cập nhật giá trị vào đúng đường dẫn lồng nhau
                _.set(settingsData, path, url);
            });

            // Chờ tất cả các file được upload xong
            await Promise.all(uploadPromises);
        }
        
        // Gọi service để lưu đối tượng settings hoàn chỉnh
        const updatedSettings = await adminService.updateSettings(settingsData);
        
        res.status(200).json({
            message: "Cài đặt đã được cập nhật thành công.",
            data: updatedSettings
        });
    } catch (error) {
        next(error);
    }
};
