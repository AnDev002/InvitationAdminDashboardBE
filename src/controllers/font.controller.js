// TrainData/AdminBE/controllers/font.controller.js
const fontService = require('../services/font.service');
// This will be replaced with a generic file upload service if you have one.
// For now, assuming fonts are not images and won't use Cloudflare Images.
// If you have a different service for files, import it here.
// const { uploadFile } = require('../services/file.service'); 

exports.getPublicFonts = async (req, res, next) => {
    try {
        const fonts = await fontService.getAllFonts();
        res.status(200).json({ status: 'success', data: fonts });
    } catch (error) {
        next(error);
    }
};

exports.getFonts = async (req, res, next) => {
    try {
        const fonts = await fontService.getAllFonts();
        res.status(200).json({ status: 'success', data: fonts });
    } catch (error) {
        next(error);
    }
};

exports.createFont = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng tải lên một file font.' });
        }

        // Since Cloudflare Images is for images, you'd need a different service for font files.
        // The logic below assumes you have a generic file upload service.
        // const { url } = await uploadFile(req.file.buffer, req.file.mimetype);

        // Placeholder until you provide a generic file service
        const url = "https://example.com/placeholder-font-url";

        const fontData = {
            name: req.body.name,
            category: req.body.category || 'General',
            url: url
        };

        const newFont = await fontService.createFont(fontData);
        res.status(201).json({ status: 'success', data: newFont });
    } catch (error) {
        if (error.code === 11000) { // Lỗi trùng tên font
            return res.status(409).json({ message: 'Tên font này đã tồn tại.' });
        }
        next(error);
    }
};

exports.deleteFont = async (req, res, next) => {
    try {
        await fontService.deleteFontById(req.params.id);
        res.status(204).send(); // No Content
    } catch (error) {
        next(error);
    }
};

exports.bulkCreateFonts = async (req, res, next) => {
    try {
        const files = req.files;
        const metadata = JSON.parse(req.body.metadata || '[]');

        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'Vui lòng chọn ít nhất một file font.' });
        }

        if (files.length !== metadata.length) {
            return res.status(400).json({ message: 'Số lượng file và metadata không khớp.' });
        }

        // Again, assuming a generic file upload service for fonts.
        const uploadPromises = files.map(async (file, index) => {
            // const { url } = await uploadFile(file.buffer, file.mimetype);
            const url = `https://example.com/placeholder-font-url-${index}`;
            return {
                name: metadata[index].name,
                category: metadata[index].category || 'Custom',
                url: url
            };
        });

        const fontsToCreate = await Promise.all(uploadPromises);
        
        const newFonts = await fontService.bulkCreateFonts(fontsToCreate);

        res.status(201).json({
            status: 'success',
            message: `Đã thêm thành công ${newFonts.length} font.`,
            data: newFonts
        });

    } catch (error) {
        // Xử lý lỗi nếu có font bị trùng tên
        if (error.code === 11000) {
            return res.status(409).json({
                message: `Thêm mới thất bại. Có ${error.writeErrors.length} lỗi, có thể do trùng tên font.`,
                errors: error.writeErrors.map(e => `Font '${e.op.name}' đã tồn tại.`),
            });
        }
        next(error);
    }
};