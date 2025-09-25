// AdminBE/services/cloudflare.service.js

import axios from 'axios';
import FormData from 'form-data';
const AppError = require('../utils/AppError'); // <-- ADD THIS LINE

// Tạm thời hardcode để debug, sau khi sửa xong hãy chuyển lại vào process.env
const CLOUDFLARE_ACCOUNT_ID = "e7c5347541597ef74ad3c97cad071393";
const CLOUDFLARE_API_TOKEN = "0PYlIHJ22loaR9LRsJQHII8FOs_d6VojDnuEBDIK";
const CLOUDFLARE_ACCOUNT_HASH = "mYCNH6-2h27PJijuhYd-fw";

/**
 * === HÀM ĐÃ SỬA LỖI ===
 * Lấy URL upload một lần từ Cloudflare.
 * Thay đổi quan trọng: truyền `null` thay vì `{}` để axios không tự động
 * thêm header 'Content-Type: application/json'.
 */
const getUploadUrl = async () => {
    try {
        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`,
            null, // <-- THAY ĐỔI QUAN TRỌNG NHẤT NẰM Ở ĐÂY
            {
                headers: {
                    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                },
            }
        );
        return response.data.result.uploadURL;
    } catch (error) {
        console.error('Error getting Cloudflare upload URL:', error.response?.data);
        throw new Error('Could not get image upload URL.');
    }
};

/**
 * Upload file lên Cloudflare. Hàm này đã đúng từ trước
 * và không cần thay đổi.
 */
export const uploadFileToCloudflare = async (fileBuffer, contentType) => {
    if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
        throw new AppError('Cloudflare API token or Account ID is not configured.', 500);
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;

    try {
        const form = new FormData();
        // Tạo một Blob với đúng contentType để FormData gửi đi chính xác
        form.append('file', fileBuffer, { contentType });

        const response = await axios.post(url, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            },
        });

        if (!response.data.success) {
            console.error('Error uploading to Cloudflare Images:', response.data);
            throw new AppError('Failed to upload file to Cloudflare Images.', 500, response.data.errors);
        }

        const result = response.data.result;
        return {
            id: result.id,
            url: result.variants[0] // Trả về URL của variant mặc định (public)
        };
    } catch (error) {
        console.error('Axios error during Cloudflare upload:', error.response ? error.response.data : error.message);
        throw new AppError(error.message || 'An unexpected error occurred during file upload.', error.response?.status || 500);
    }
};



// Các hàm deleteFileFromCloudflare và getImageIdFromUrl không thay đổi
export const deleteFileFromCloudflare = async (imageId) => {
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

export const getImageIdFromUrl = (url) => {
    if (!url || !url.includes(CLOUDFLARE_ACCOUNT_HASH)) {
        return null;
    }
    const parts = url.split('/');
    if (parts.length >= 5) {
        return parts[parts.length - 2];
    }
    return null;
};