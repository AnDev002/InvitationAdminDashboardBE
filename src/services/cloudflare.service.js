// src/services/cloudflare.service.js

const axios = require('axios');
const FormData = require('form-data');
const AppError = require('../utils/AppError.js');
// Thêm dòng này để nạp các biến môi trường từ file .env (nếu có trong tương lai)
require('dotenv').config();

// Các thông tin xác thực đang được sử dụng trực tiếp từ đây.
// Quan trọng: Hãy đảm bảo các giá trị này là chính xác.
const CLOUDFLARE_ACCOUNT_ID = "e7c5347541597ef74ad3c97cad071393";
const CLOUDFLARE_API_TOKEN = "iimJzYvdP73ZNjq95BgaogjOaOsZ8L0RoAbHZ5YL";
const CLOUDFLARE_ACCOUNT_HASH = "mYCNH6-2h27PJijuhYd-fw";

/**
 * Upload file lên Cloudflare Images.
 * @param {Buffer} fileBuffer - Buffer của file (dữ liệu nhị phân).
 * @param {string} contentType - Kiểu MIME của file (ví dụ: 'image/webp').
 * @returns {Promise<{id: string, url: string}>} - ID và URL công khai của ảnh đã tải lên.
 */
const uploadFileToCloudflare = async (fileBuffer, contentType) => {
    // === BẮT ĐẦU THÊM MỚI: LOG ĐỂ GỠ LỖI ===
    console.log("--- [DEBUG] Cloudflare Upload ---");
    console.log("Sử dụng Account ID:", CLOUDFLARE_ACCOUNT_ID);
    console.log("Sử dụng API Token (5 ký tự đầu):", CLOUDFLARE_API_TOKEN ? CLOUDFLARE_API_TOKEN.substring(0, 5) + "..." : "!!! TOKEN BỊ THIẾU !!!");
    // === KẾT THÚC THÊM MỚI ===

    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
        throw new AppError('Cloudflare API token or Account ID is not configured.', 500);
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`;

    try {
        const form = new FormData();
        form.append('file', fileBuffer, { contentType });

        const response = await axios.post(url, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            },
        });

        if (!response.data.success) {
            console.error('Error uploading to Cloudflare Images:', response.data);
            throw new AppError('Failed to upload file to Cloudflare Images.', 500, response.data.errors);
        }

        const result = response.data.result;
        return {
            id: result.id,
            url: result.variants[0] // Trả về URL của variant công khai
        };
    } catch (error) {
        console.error('Axios error during Cloudflare upload:', error.response ? error.response.data : error.message);
        throw new AppError(error.message || 'An unexpected error occurred during file upload.', error.response?.status || 500);
    }
};

/**
 * Xóa một ảnh khỏi Cloudflare Images.
 * @param {string} imageId - ID của ảnh cần xóa.
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
        if (error.response?.status !== 404) {
            console.error(`Error deleting image ${imageId} from Cloudflare:`, error.response?.data);
        }
    }
};

/**
 * Trích xuất ID ảnh từ URL Cloudflare.
 * @param {string} url - URL đầy đủ của ảnh.
 * @returns {string|null}
 */
const getImageIdFromUrl = (url) => {
    if (!url || !CLOUDFLARE_ACCOUNT_HASH || !url.includes(CLOUDFLARE_ACCOUNT_HASH)) {
        return null;
    }
    const parts = url.split('/');
    if (parts.length >= 5) {
        return parts[parts.length - 2];
    }
    return null;
};

module.exports = {
  deleteFileFromCloudflare,   
  uploadFileToCloudflare,
  getImageIdFromUrl
};