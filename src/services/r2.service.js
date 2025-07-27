// src/services/r2.service.js
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import { r2 } from '../config/r2.config.js';

const BUCKET_NAME = process.env.BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

/**
 * Upload một file lên Cloudflare R2.
 * @param {Buffer} fileBuffer - Buffer của file.
 * @param {string} mimetype - Kiểu MIME của file.
 * @returns {Promise<{key: string, url: string}>} - Key và URL của file đã upload.
 */
export const uploadFileToR2 = async (fileBuffer, mimetype) => {
  // Tạo tên file ngẫu nhiên để tránh trùng lặp
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

    // Trả về key và URL công khai của file
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
 * Xóa một file khỏi Cloudflare R2.
 * @param {string} fileKey - Key của file cần xóa.
 * @returns {Promise<void>}
 */
export const deleteFileFromR2 = async (fileKey) => {
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
    // Không throw error ở đây để tránh làm gián đoạn flow xóa chính,
    // nhưng bạn có thể thay đổi tùy theo yêu cầu của ứng dụng.
  }
};
