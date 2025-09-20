// src/services/r2.service.js
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { randomBytes } = require('crypto');

// Since this is no longer an ES module, we don't need dotenv/config here
// as it should be loaded once at the start of your application (e.g., in index.js)

const BUCKET_NAME = process.env.BUCKET_NAME;
const R2_PUBLIC_URL = "https://r2.icards.com.vn";

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file to Cloudflare R2.
 * @param {Buffer} fileBuffer - Buffer of the file.
 * @param {string} mimetype - MIME type of the file.
 * @returns {Promise<{key: string, url: string}>} - Key and URL of the uploaded file.
 */
const uploadFileToR2 = async (fileBuffer, mimetype) => {
  const fileKey = randomBytes(16).toString('hex');

  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: mimetype,
  };

  try {
    const command = new PutObjectCommand(params);
    await r2.send(command);

    return {
      key: fileKey,
      url: `${R2_PUBLIC_URL}/${fileKey}`,
    };
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw new Error('Failed to upload file.');
  }
};

/**
 * Delete a file from Cloudflare R2.
 * @param {string} fileKey - Key of the file to delete.
 * @returns {Promise<void>}
 */
const deleteFileFromR2 = async (fileKey) => {
  if (!fileKey) return;

  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
  };

  try {
    const command = new DeleteObjectCommand(params);
    await r2.send(command);
  } catch (error) {
    console.error(`Error deleting file ${fileKey} from R2:`, error);
  }
};

module.exports = {
    uploadFileToR2,
    deleteFileFromR2,
};