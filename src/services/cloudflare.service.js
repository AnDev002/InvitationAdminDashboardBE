// AdminBE/services/cloudflare.service.js
// NỘI DUNG MỚI: THAY THẾ TOÀN BỘ TỆP NÀY
const axios = require('axios');
const FormData = require('form-data');
const dotenv = require('dotenv');

dotenv.config();

// Đảm bảo các biến môi trường này có trong tệp .env của bạn
const CLOUDFLARE_ACCOUNT_ID = "e7c5347541597ef74ad3c97cad071393";
const CLOUDFLARE_API_TOKEN = "0PYlIHJ22loaR9LRsJQHII8FOs_d6VojDnuEBDIK";
const CLOUDFLARE_ACCOUNT_HASH = "mYCNH6-2h27PJijuhYd-fw";

/**
 * Lấy URL upload một lần từ Cloudflare.
 */
const getUploadUrl = async () => {
    try {
        if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
            throw new Error('Cloudflare Account ID hoặc API Token chưa được cấu hình trong file .env');
        }
        
        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`,
            null,
            {
                headers: {
                    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                },
            }
        );
        return response.data.result.uploadURL;
    } catch (error) {
        console.error('Lỗi khi lấy URL tải lên của Cloudflare:', error.response?.data);
        throw new Error('Không thể lấy được URL để tải ảnh lên.');
    }
};

/**
 * Tải file buffer lên Cloudflare Images.
 * @param {Buffer} fileBuffer - Buffer của file (đã qua sharp nếu cần).
 * @param {string} mimetype - (Không bắt buộc) Kiểu mime, mặc định là image/webp.
 * @returns {Promise<{url: string, id: string}>} - URL công khai và ID của ảnh.
 */
const uploadFileToCloudflare = async (fileBuffer, mimetype = 'image/webp') => {
    try {
        const uploadURL = await getUploadUrl();
        
        const form = new FormData();
        // Cloudflare Images tự phát hiện kiểu file, nhưng ta có thể đặt tên file
        form.append('file', fileBuffer, 'image.webp'); 

        const response = await axios.post(uploadURL, form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        const result = response.data.result;
        
        if (!CLOUDFLARE_ACCOUNT_HASH) {
             throw new Error('Cloudflare Account Hash (CLOUDFLARE_ACCOUNT_HASH) chưa được cấu hình. Không thể tạo URL công khai.');
        }

        return {
            id: result.id,
            // Sử dụng biến môi trường hash để tạo URL
            url: `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${result.id}/public`,
        };
    } catch (error) {
        console.error('Lỗi khi tải ảnh lên Cloudflare Images:', error.response?.data);
        throw new Error('Tải file lên Cloudflare Images thất bại.');
    }
};

/**
 * Xóa một ảnh khỏi Cloudflare Images bằng ID.
 * @param {string} imageId - ID của ảnh trên Cloudflare.
 */
const deleteFileFromCloudflare = async (imageId) => {
    if (!imageId) return;
    try {
        await axios.delete(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
            {
                headers: {
                    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                },
            }
        );
    } catch (error) {
        // Bỏ qua lỗi 404 (ảnh không tồn tại)
        if (error.response?.status !== 404) {
            console.error(`Lỗi khi xóa ảnh ${imageId} từ Cloudflare:`, error.response?.data);
        }
    }
};

/**
 * Lấy Image ID từ URL đầy đủ của Cloudflare.
 * @param {string} url - URL (ví dụ: https://imagedelivery.net/HASH/ID/public)
 * @returns {string|null} - ID của ảnh.
 */
const getImageIdFromUrl = (url) => {
    if (!url || !CLOUDFLARE_ACCOUNT_HASH || !url.includes(CLOUDFLARE_ACCOUNT_HASH)) {
        return null;
    }
    const parts = url.split('/');
    // URL có dạng: https: / / imagedelivery.net / HASH / ID / variant
    if (parts.length >= 5) {
        return parts[parts.length - 2]; // Lấy ID
    }
    return null;
};

module.exports = {
    getUploadUrl,
    uploadFileToCloudflare,
    deleteFileFromCloudflare,
    getImageIdFromUrl
};