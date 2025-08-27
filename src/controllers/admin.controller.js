// AdminTrainData/AdminBE/controllers/admin.controller.js

const adminService = require('../services/admin.service');
const _ = require('lodash');
const sharp = require('sharp');
const { uploadFileToR2 } = require('../services/r2.service');
const Settings = require('../models/settings.model');

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
exports.getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
            await settings.save();
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateSettings = async (req, res, next) => {
    try {
        const settingsData = JSON.parse(req.body.settings || '{}');

        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                let fileBuffer = file.buffer;
                let fileMimeType = file.mimetype;

                if (file.mimeType !== 'image/gif') {
                    fileBuffer = await sharp(file.buffer)
                        .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 85 })
                        .toBuffer();
                    fileMimeType = 'image/webp';
                }

                const { url } = await uploadFileToR2(fileBuffer, fileMimeType);
                
                // [FIX] Thay đổi logic chuyển đổi tên file thành đường dẫn đối tượng.
                // Chuyển đổi dấu "__" thành "." để tái tạo đường dẫn lồng nhau một cách chính xác.
                // Ví dụ: 'banners__home_secondary_1__imageUrl' sẽ trở thành 'banners.home_secondary_1.imageUrl'.
                const path = file.fieldname.replace(/__/g, '.');
                
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

exports.updateInvitationTemplatePreview = catchAsync(async (req, res, next) => {
  const template = await InvitationTemplate.findByIdAndUpdate(
    req.params.id,
    { previewDetails: req.body },
    { new: true, runValidators: true }
  );

  if (!template) {
    return next(new AppError('Không tìm thấy mẫu thiệp với ID này', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      template,
    },
  });
});