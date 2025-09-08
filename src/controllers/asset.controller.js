const sharp = require('sharp');
const { uploadFileToCloudflare } = require('../services/cloudflare.service');

/**
 * [CONTROLLER MỚI]
 * Xử lý tải lên nhiều file cùng lúc và trả về một map các URL.
 */
exports.handleBatchUpload = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Không có file nào được tải lên.' });
        }

        const uploadPromises = req.files.map(async (file) => {
            const processedBuffer = await sharp(file.buffer)
                .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer();
            
            const { url } = await uploadFileToCloudflare(processedBuffer);
            
            // Trả về một object với key là fieldname (placeholder) và value là URL thật
            return { placeholder: file.fieldname, url };
        });

        const results = await Promise.all(uploadPromises);

        // Chuyển mảng kết quả thành một object map
        const urlMap = results.reduce((acc, current) => {
            acc[current.placeholder] = current.url;
            return acc;
        }, {});

        res.status(200).json({
            status: 'success',
            message: `Đã tải lên thành công ${results.length} file.`,
            urls: urlMap
        });

    } catch (error) {
        console.error("Lỗi khi tải lên hàng loạt:", error);
        next(error);
    }
};