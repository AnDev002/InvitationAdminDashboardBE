// src/middleware/upload.middleware.js
import multer from 'multer';
import sharp from 'sharp';
import { uploadFileToR2 } from '../services/r2.service.js';

// Cấu hình multer để lưu file trong memory
const storage = multer.memoryStorage();
const FONT_MIME_TYPES = [
    'font/ttf',
    'font/otf',
    'font/woff',
    'font/woff2',
    'application/font-woff',
    'application/font-woff2',
    'application/x-font-truetype',
    'application/x-font-opentype',
    'application/vnd.ms-fontobject', // Dành cho .eot
    'application/font-sfnt',
    'application/octet-stream' // Kiểu nhị phân chung, thường được dùng làm dự phòng
];

const fileFilter = (req, file, cb) => {
    const allowedImageMimeTypes = file.mimetype.startsWith('image/');
    const allowedFontMimeTypes = FONT_MIME_TYPES.includes(file.mimetype);
    const allowedZipMimeTypes = [
        'application/zip', 
        'application/x-zip-compressed', 
        'multipart/x-zip'
    ].includes(file.mimetype);

    if (allowedImageMimeTypes || allowedFontMimeTypes || allowedZipMimeTypes) {
        cb(null, true);
    } else {
        if (file.originalname.toLowerCase().endsWith('.zip')) {
            cb(null, true);
            return;
        }
        cb(new Error('File không hợp lệ! Vui lòng chỉ tải lên ảnh, font chữ hoặc file .zip.'), false);
    }
};


// ++ THAY ĐỔI: Tăng giới hạn file size và số lượng file ++
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
      fileSize: 1024 * 1024 * 10, // Giới hạn 10MB mỗi file
      files: 50 // Giới hạn 50 files mỗi request
  }, 
});


export const resizeImage = async (req, res, next) => {
  if (!req.file || req.files) {
    return next(); 
  }

  try {
    const buffer = await sharp(req.file.buffer)
      .resize({ width: 800, height: 800, fit: 'inside' })
      .webp({ quality: 90 })
      .toBuffer();
    
    req.file.buffer = buffer;
    req.file.mimetype = 'image/webp';
    next();
  } catch (error) {
    console.error('Error resizing image:', error);
    next(error);
  }
};

export const uploadImageToCloudflare = async (req, res, next) => {
  if (!req.file || req.files) {
    return next();
  }

  try {
    const { buffer } = req.file;
    const cfData = await uploadFileToCloudflare(buffer);

    // Gắn URL và ID của Cloudflare vào request
    req.file.cfUrl = cfData.url;
    req.file.cfId = cfData.id;

    next();
  } catch (error) {
    console.error('Error uploading image to Cloudflare:', error);
    next(error);
  }
}