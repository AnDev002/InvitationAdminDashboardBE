// src/services/cloudflare.service.js
import axios from 'axios';
import FormData from 'form-data';

// Tạm thời hardcode để debug, sau khi sửa xong hãy chuyển lại vào process.env
const CLOUDFLARE_ACCOUNT_ID = "e7c5347541597ef74ad3c97cad071393";
const CLOUDFLARE_API_TOKEN = "0PYlIHJ22loaR9LRsJQHII8FOs_d6VojDnuEBDIK";
const CLOUDFLARE_ACCOUNT_HASH = "mYCNH6-2h27PJijuhYd-fw";

// Hàm getUploadUrl không thay đổi
const getUploadUrl = async () => {
    try {
        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`,
            {},
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

export const uploadFileToCloudflare = async (fileBuffer) => {
    try {
        const uploadURL = await getUploadUrl();
        
        const form = new FormData();
        form.append('file', fileBuffer, 'image.webp');

        // === THAY ĐỔI QUAN TRỌNG NHẤT ===
        // Xóa hoàn toàn phần config headers.
        // Chỉ cần truyền 'form' vào, axios sẽ tự động làm phần còn lại.
        const response = await axios.post(uploadURL, form);
        // ===================================

        const result = response.data.result;
        return {
            id: result.id,
            url: `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${result.id}/public`,
        };
    } catch (error) {
        console.error('Error uploading to Cloudflare Images:', error.response?.data);
        throw new Error('Failed to upload file to Cloudflare Images.');
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