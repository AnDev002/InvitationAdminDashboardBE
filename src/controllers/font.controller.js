// TrainData/AdminBE/controllers/font.controller.js
const fontService = require('../services/font.service');
// *** BƯỚC 1: IMPORT HÀM TẢI TỆP TỪ R2 SERVICE ***
const { uploadFileToR2 } = require('../services/r2.service.js');

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

        // *** SỬA LỖI: Gọi hàm uploadFileToR2 cho một file đơn ***
        const { url } = await uploadFileToR2(req.file.buffer, req.file.mimetype);

        const fontData = {
            name: req.body.name,
            category: req.body.category || 'General',
            url: url // Sử dụng URL thật
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

        // *** BƯỚC 2: THAY THẾ TOÀN BỘ LOGIC UPLOAD CŨ ***
        // Đoạn mã này sẽ lặp qua từng file, tải lên R2 và lấy URL thật
        const uploadPromises = files.map(async (file, index) => {
            // Gọi hàm tải tệp cho mỗi file trong danh sách
            const { url } = await uploadFileToR2(file.buffer, file.mimetype);

            // Trả về object hoàn chỉnh với URL thật
            return {
                name: metadata[index].name,
                category: metadata[index].category || 'Custom',
                url: url
            };
        });
        // *** KẾT THÚC THAY THẾ ***

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

// === BẮT ĐẦU THÊM MỚI ===
exports.updateFont = async (req, res, next) => {
    try {
        // Chỉ cho phép cập nhật tên
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Tên font là bắt buộc.' });
        }

        const updatedFont = await fontService.updateFontById(req.params.id, { name });

        if (!updatedFont) {
            return res.status(404).json({ message: 'Không tìm thấy font.' });
        }

        res.status(200).json({ status: 'success', data: updatedFont });
    } catch (error) {
        // Xử lý lỗi trùng tên khi cập nhật
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Tên font này đã tồn tại.' });
        }
        next(error);
    }
};

exports.bulkDeleteFonts = async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Vui lòng cung cấp danh sách ID của font cần xóa.' });
        }

        const result = await fontService.bulkDeleteFontsByIds(ids);

        res.status(200).json({
            status: 'success',
            message: `Đã xóa thành công ${result.deletedCount} font.`,
        });
    } catch (error) {
        next(error);
    }
};
// === KẾT THÚC THÊM MỚI ===