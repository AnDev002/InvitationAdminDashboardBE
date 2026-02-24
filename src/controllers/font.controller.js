// TrainData/AdminBE/controllers/font.controller.js
const fontService = require('../services/font.service');
// *** BƯỚC 1: IMPORT HÀM TẢI TỆP TỪ R2 SERVICE ***
const { uploadFileToR2 } = require('../services/r2.service.js');
const Font = require('../models/font.model');

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
        // Parse metadata an toàn
        let metadata = [];
        try {
            metadata = JSON.parse(req.body.metadata || '[]');
        } catch (e) {
            return res.status(400).json({ message: 'Dữ liệu metadata không hợp lệ (JSON parse error).' });
        }

        const overwrite = req.body.overwrite === 'true'; // Cờ cho phép ghi đè

        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'Vui lòng chọn ít nhất một file font.' });
        }

        // *** FIX LỖI "Cannot read properties of undefined" ***
        if (files.length !== metadata.length) {
            return res.status(400).json({ 
                message: `Dữ liệu không khớp: Nhận được ${files.length} file nhưng có ${metadata.length} thông tin metadata.` 
            });
        }

        // BƯỚC 1: KIỂM TRA TRÙNG LẶP (Nếu chưa bật overwrite)
        const incomingNames = metadata.map(m => m.name);
        // Tìm các font đã tồn tại trong DB có tên nằm trong danh sách upload
        const existingFonts = await Font.find({ name: { $in: incomingNames } }).select('name');
        
        if (existingFonts.length > 0 && !overwrite) {
            const duplicateNames = existingFonts.map(f => f.name);
            // Trả về lỗi 409 kèm danh sách tên bị trùng để Frontend hiển thị
            return res.status(409).json({
                status: 'fail',
                code: 'DUPLICATE_FONTS',
                message: 'Phát hiện font trùng tên.',
                duplicates: duplicateNames
            });
        }

        // BƯỚC 2: UPLOAD FILE LÊN R2
        // Chỉ upload khi không trùng hoặc người dùng đã đồng ý ghi đè
        const uploadPromises = files.map(async (file, index) => {
            const meta = metadata[index];
            
            // Check an toàn lần nữa
            if (!meta || !meta.name) {
                throw new Error(`Metadata bị thiếu tại vị trí ${index}`);
            }

            const { url } = await uploadFileToR2(file.buffer, file.mimetype);

            return {
                name: meta.name,
                category: meta.category || 'General',
                url: url
            };
        });

        const fontsToProcess = await Promise.all(uploadPromises);

        // BƯỚC 3: LƯU VÀO DB (SỬ DỤNG BULK WRITE ĐỂ UPSERT)
        // Thay vì gọi insertMany (sẽ lỗi nếu trùng), ta gọi hàm xử lý bulk upsert
        const result = await fontService.bulkUpsertFonts(fontsToProcess);

        res.status(201).json({
            status: 'success',
            message: `Đã xử lý thành công ${fontsToProcess.length} font.`,
            data: result
        });

    } catch (error) {
        next(error);
    }
};

// === BẮT ĐẦU THÊM MỚI ===
exports.updateFont = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category } = req.body;

        // Tự động tạo object update chỉ chứa các trường có giá trị truyền lên
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (category !== undefined) updateData.category = category;

        // Kiểm tra xem tên có bị trùng với font khác không (nếu thao tác đổi tên)
        if (name) {
            const existingFont = await Font.findOne({ name, _id: { $ne: id } });
            if (existingFont) {
                return res.status(409).json({ message: "Tên font đã tồn tại trong hệ thống." });
            }
        }

        // Cập nhật với dữ liệu đã lọc, ngăn Mongoose tự chèn undefined
        const updatedFont = await Font.findByIdAndUpdate(
            id,
            { $set: updateData }, 
            { new: true, runValidators: true }
        );

        if (!updatedFont) {
            return res.status(404).json({ message: "Không tìm thấy font." });
        }

        res.status(200).json({ message: "Cập nhật thành công", font: updatedFont });
    } catch (error) {
        console.error("Update Font Error:", error);
        
        // Bắt và hiển thị lỗi validation cụ thể từ Mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        
        res.status(500).json({ message: "Lỗi server khi cập nhật font." });
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

exports.bulkUpdateCategory = async (req, res) => {
    try {
        const { ids, category } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "Danh sách ID không hợp lệ." });
        }

        if (!category) {
            return res.status(400).json({ message: "Vui lòng cung cấp loại font (category)." });
        }

        // Cập nhật tất cả các font có _id nằm trong mảng ids
        const result = await Font.updateMany(
            { _id: { $in: ids } }, // Điều kiện tìm kiếm
            { $set: { category: category } } // Dữ liệu cập nhật
        );

        res.status(200).json({ 
            message: `Đã cập nhật thành công ${result.modifiedCount} font.`,
            updatedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("Bulk Update Category Error:", error);
        res.status(500).json({ message: "Lỗi server khi cập nhật hàng loạt." });
    }
};