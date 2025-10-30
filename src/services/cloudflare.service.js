// AdminBE/services/cloudflare.service.js
const { uploadFileToR2, deleteFileFromR2 } = require('./r2.service');
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev";

/**
 * [ĐÃ SỬA]
 * Hàm này bây giờ sẽ upload file lên R2 thay vì Cloudflare Images.
 * @param {Buffer} fileBuffer - Buffer của file.
 * @param {string} mimetype - Kiểu MIME của file.
 * @returns {Promise<{url: string, id: string}>} - URL công khai và key của file.
 */
const uploadFileToCloudflare = async (fileBuffer, mimetype = 'image/webp') => {
    try {
        // Gọi hàm upload của R2 service
        const { key, url } = await uploadFileToR2(fileBuffer, mimetype);
        return {
            id: key, // Dùng key của R2 làm ID
            url: url
        };
    } catch (error) {
        console.error('Lỗi khi tải file lên R2 từ cloudflare.service:', error);
        throw new Error('Tải file lên R2 thất bại.');
    }
};

/**
 * [ĐÃ SỬA]
 * Hàm này sẽ xóa file trên R2.
 * @param {string} fileKey - Key của file trên R2 (chính là imageId).
 */
const deleteFileFromCloudflare = async (fileKey) => {
    if (!fileKey) return;
    try {
        await deleteFileFromR2(fileKey);
    } catch (error) {
        console.error(`Lỗi khi xóa file ${fileKey} từ R2:`, error);
    }
};

/**
 * [ĐÃ SỬA]
 * Lấy file key từ URL của R2.
 * @param {string} url - URL của file.
 * @returns {string|null} - Key của file.
 */
const getImageIdFromUrl = (url) => {
    if (!url || !url.startsWith(R2_PUBLIC_URL)) {
        return null;
    }
    // Key chính là phần cuối cùng của URL
    return url.substring(R2_PUBLIC_URL.length + 1);
};

// Giữ lại getUploadUrl để tránh lỗi ở những chỗ chưa kịp sửa, nhưng nó sẽ không làm gì cả.
const getUploadUrl = async () => {
    return Promise.resolve('');
};

module.exports = {
    getUploadUrl,
    uploadFileToCloudflare,
    deleteFileFromCloudflare,
    getImageIdFromUrl
};