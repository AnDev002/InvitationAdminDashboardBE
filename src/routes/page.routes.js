// TrainData/AdminBE/routes/page.routes.js
const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page.controller');
const { upload } = require('../middleware/upload.middleware');
const { uploadFileToCloudflare } = require('../services/cloudflare.service');
const sharp = require('sharp');

router.route('/categories')
    .get(pageController.getAllPageCategories)
    .post(pageController.createPageCategory);

router.route('/categories/:id')
    .put(pageController.updatePageCategory)
    .delete(pageController.deletePageCategory);

router.route('/')
    .get(pageController.getPages)
    .post(upload.any(), pageController.createPage);

// === BẮT ĐẦU THÊM MỚI ===
router.put('/update-order', pageController.updatePageOrder);
// === KẾT THÚC THÊM MỚI ===

router.route('/:id')
    .get(pageController.getPage)
    .put(upload.any(), pageController.updatePage)    
    .patch(upload.any(), pageController.updatePage)  
    .delete(pageController.deletePage);

router.post(
    '/upload-image',
    upload.single('upload'),
    async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    error: {
                        message: 'Không tìm thấy file ảnh nào để tải lên.'
                    }
                });
            }

            const processedBuffer = await sharp(req.file.buffer)
                .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            const { url } = await uploadFileToCloudflare(processedBuffer);

            res.status(200).json({
                url: url
            });

        } catch (error) {
            console.error("Lỗi khi tải ảnh từ CKEditor:", error);
            res.status(500).json({
                error: {
                    message: `Tải ảnh lên thất bại: ${error.message}`
                }
            });
        }
    }
);
module.exports = router;