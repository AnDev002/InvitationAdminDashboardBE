// AdminBE/services/cloudflare.service.js

const axios = require('axios');
const FormData = require('form-data');
const AppError = require('../utils/AppError'); // Assuming AppError is in utils

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH;

/**
 * Upload file to Cloudflare Images.
 */
const uploadFileToCloudflare = async (fileBuffer, contentType) => {
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
            throw new AppError('Failed to upload file to Cloudflare Images.', 500);
        }

        const result = response.data.result;
        return {
            id: result.id,
            url: result.variants[0]
        };
    } catch (error) {
        console.error('Axios error during Cloudflare upload:', error.response ? error.response.data : error.message);
        throw new AppError(error.message || 'An unexpected error occurred during file upload.', error.response?.status || 500);
    }
};

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

const getImageIdFromUrl = (url) => {
    if (!url || !url.includes(CLOUDFLARE_ACCOUNT_HASH)) {
        return null;
    }
    const parts = url.split('/');
    if (parts.length >= 5) {
        return parts[parts.length - 2];
    }
    return null;
};

module.exports = {
    uploadFileToCloudflare,
    deleteFileFromCloudflare,
    getImageIdFromUrl,
};