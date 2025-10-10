// AdminBE/services/cloudflare.service.js
const axios = require('axios');
const FormData = require('form-data');

// Ensure your .env variables are loaded correctly before this file is imported
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH;

/**
 * Step 1: Get a one-time upload URL from Cloudflare.
 * This is the secure and recommended way to handle uploads.
 */
const getUploadUrl = async () => {
    try {
        if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
            throw new Error('Cloudflare Account ID or API Token is not configured in the .env file.');
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
        // --- START: ENHANCED ERROR LOGGING ---
        console.error('--- Full error details from getUploadUrl ---');
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Request Error: No response was received. This could be a firewall or network issue.');
            console.error('Request details:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Axios Setup Error:', error.message);
        }
        console.error('Full Error Object:', error);
        console.error('--------------------------------------------');
        // --- END: ENHANCED ERROR LOGGING ---

        throw new Error('Could not get the URL for image upload.');
    }
};

/**
 * Step 2: Upload the actual file buffer to the one-time URL.
 */
const uploadFileToCloudflare = async (fileBuffer) => {
    try {
        const uploadURL = await getUploadUrl();

        const form = new FormData();
        // The field name must be 'file' for Cloudflare Images
        form.append('file', fileBuffer, 'image.webp');

        const response = await axios.post(uploadURL, form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        const result = response.data.result;
        return {
            id: result.id,
            // Construct the public URL using your account hash
            url: `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${result.id}/public`,
        };
    } catch (error) {
        console.error('Error uploading file to Cloudflare Images:', error.response?.data);
        throw new Error('File upload to Cloudflare Images failed.');
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
    if (!url || !CLOUDFLARE_ACCOUNT_HASH || !url.includes(CLOUDFLARE_ACCOUNT_HASH)) {
        return null;
    }
    const parts = url.split('/');
    if (parts.length >= 5) {
        // The image ID is typically the second to last part of the URL path
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