// AdminBE/services/cloudflare.service.js

const axios = require('axios');
const FormData = require('form-data');
const AppError = require('../utils/AppError.js'); // <-- CORRECTED THIS LINE

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
const uploadFileToCloudflare = async (fileBuffer, contentType) => {
    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
        throw new AppError('Cloudflare API token or Account ID is not configured.', 500);
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`;

    try {
        // 3. Tạo một đối tượng FormData và đính kèm file buffer.
        const form = new FormData();
        form.append('file', fileBuffer, { contentType });

        console.log("--- DEBUGGING CLOUDFLARE UPLOAD ---");
        console.log("Account ID being used:", process.env.CLOUDFLARE_ACCOUNT_ID);
        // Chỉ log vài ký tự đầu của token để đảm bảo an toàn
        console.log("Token starts with:", process.env.CLOUDFLARE_API_TOKEN ? process.env.CLOUDFLARE_API_TOKEN.substring(0, 5) : "Token not found!");
        console.log("-------------------------------------");

        // 4. Gửi yêu cầu POST đến API của Cloudflare bằng Axios.
        const response = await axios.post(url, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            },
        });

        // 5. Kiểm tra phản hồi từ Cloudflare.
        if (!response.data.success) {
            console.error('Error uploading to Cloudflare Images:', response.data);
            throw new AppError('Failed to upload file to Cloudflare Images.', 500, response.data.errors);
        }

        // 6. Trả về ID và URL của ảnh nếu thành công.
        const result = response.data.result;
        return {
            id: result.id,
            url: result.variants[0] // Trả về URL của variant mặc định (public)
        };
    } catch (error) {
        console.error('Axios error during Cloudflare upload:', error.response ? error.response.data : error.message);
        // Ném ra một AppError để được xử lý bởi global error handler.
        throw new AppError(error.message || 'An unexpected error occurred during file upload.', error.response?.status || 500);
    }
};


// Các hàm deleteFileFromCloudflare và getImageIdFromUrl không thay đổi
const deleteFileFromCloudflare = async (imageId) => {
    if (!imageId) return;
    try {
        await axios.delete(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                },
            }
        );
    } catch (error) {
        // Không báo lỗi nếu ảnh không tồn tại (lỗi 404), chỉ báo các lỗi khác.
        if (error.response?.status !== 404) {
            console.error(`Error deleting image ${imageId} from Cloudflare:`, error.response?.data);
        }
    }
};


const getImageIdFromUrl = (url) => {
    if (!url || !url.includes(CLOUDFLARE_ACCOUNT_HASH)) {
        return null;
    }
    const parts = url.split('/');
    // ID thường nằm ở phần tử thứ 2 từ cuối trong URL (ví dụ: .../images/v1/IMAGE_ID/variant)
    if (parts.length >= 5) {
        return parts[parts.length - 2];
    }
    return null;
};
module.exports = {
    getUploadUrl,
    uploadFileToCloudflare,
    deleteFileFromCloudflare,
    getImageIdFromUrl
};