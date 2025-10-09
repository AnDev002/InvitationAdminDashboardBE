// src/services/cloudflare.service.js

const axios = require('axios');
const FormData = require('form-data');
const AppError = require('../utils/AppError.js');
// Thêm dòng này để nạp các biến môi trường từ file .env
require('dotenv').config();

// SỬA LỖI: Chuyển các hằng số thành biến môi trường để tăng tính bảo mật và linh hoạt
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH;


/**
 * Upload file lên Cloudflare Images.
 * @param {Buffer} fileBuffer - Buffer của file (dữ liệu nhị phân).
 * @param {string} contentType - Kiểu MIME của file (ví dụ: 'image/webp').
 * @returns {Promise<{id: string, url: string}>} - ID và URL công khai của ảnh đã tải lên.
 */
const uploadFileToCloudflare = async (fileBuffer, contentType) => {
    // Kiểm tra xem các biến môi trường đã được cấu hình chưa
    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
        throw new AppError('Cloudflare API token or Account ID is not configured in .env file.', 500);
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
            // Cung cấp thông báo lỗi chi tiết hơn
            const errorMessage = response.data.errors.length > 0 ? response.data.errors[0].message : 'Failed to upload file to Cloudflare Images.';
            throw new AppError(errorMessage, 500, response.data.errors);
        }

        const result = response.data.result;
        return {
            id: result.id,
            url: result.variants[0] // Trả về URL của variant công khai
        };
    } catch (error) {
        // Bắt lỗi từ axios và AppError để cung cấp thông tin rõ ràng
        console.error('Axios error during Cloudflare upload:', error.response ? error.response.data : error.message);
        const statusCode = error.response?.status || 500;
        const message = error.isOperational ? error.message : 'An unexpected error occurred during file upload.';
        throw new AppError(message, statusCode);
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
    // SỬA LỖI: Kiểm tra CLOUDFLARE_ACCOUNT_HASH trước khi sử dụng
    if (!url || !CLOUDFLARE_ACCOUNT_HASH || !url.includes(CLOUDFLARE_ACCOUNT_HASH)) {
        return null;
    }
    const parts = url.split('/');
    // Vị trí ID có thể thay đổi, tìm phần tử ngay sau Account Hash
    const hashIndex = parts.findIndex(part => part === CLOUDFLARE_ACCOUNT_HASH);
    if (hashIndex !== -1 && hashIndex + 1 < parts.length) {
        return parts[hashIndex + 1];
    }
    return null;
};

module.exports = {
  deleteFileFromCloudflare,   
  uploadFileToCloudflare,
  getImageIdFromUrl
};