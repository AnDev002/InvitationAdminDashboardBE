// TrainData/AdminBE/controllers/font.controller.js
const fontService = require('../services/font.service');
const { uploadFileToR2 } = require('../services/r2.service');

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

        // Tải file font lên R2
        const { url } = await uploadFileToR2(req.file.buffer, req.file.mimetype);

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