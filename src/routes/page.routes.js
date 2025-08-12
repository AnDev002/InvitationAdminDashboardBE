// TrainData/AdminBE/routes/page.routes.js
const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page.controller');
const { upload } = require('../middleware/upload.middleware');
const { uploadFileToR2 } = require('../services/r2.service');
const sharp = require('sharp');

// Các route này đã được bảo vệ bởi admin middleware ở file index
router.route('/')
    .get(pageController.getPages)
    .post(upload.any(), pageController.createPage);

router.route('/:id')
    .get(pageController.getPage)
    .put(upload.any(), pageController.updatePage) 
    .delete(pageController.deletePage);

router.post(
    // URL sẽ là: /api/v1/admin/pages/upload-image
    '/upload-image',

    // Middleware của multer để nhận 1 file duy nhất.
    // CKEditor mặc định gửi file với field name là 'upload'.
    upload.single('upload'),

    // Hàm xử lý logic chính
    async (req, res, next) => {
        try {
            // 1. Kiểm tra xem file đã được tải lên chưa
            if (!req.file) {
                // Sử dụng định dạng lỗi của CKEditor
                return res.status(400).json({
                    error: {
                        message: 'Không tìm thấy file ảnh nào để tải lên.'
                    }
                });
            }

            // 2. (Tùy chọn nhưng khuyến khích) Tối ưu hóa ảnh với Sharp
            const processedBuffer = await sharp(req.file.buffer)
                .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            // 3. Tải file đã xử lý lên R2 Storage
            const { url } = await uploadFileToR2(processedBuffer, 'image/webp');

            // 4. Trả về JSON theo đúng định dạng mà CKEditor yêu cầu
            // Khi nhận được JSON này, CKEditor sẽ tự động chèn ảnh vào trình soạn thảo.
            res.status(200).json({
                url: url
            });

        } catch (error) {
            console.error("Lỗi khi tải ảnh từ CKEditor:", error);
            // Trả về lỗi theo định dạng của CKEditor
            res.status(500).json({
                error: {
                    message: `Tải ảnh lên thất bại: ${error.message}`
                }
            });
        }
    }
);
module.exports = router;