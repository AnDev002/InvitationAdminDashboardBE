// src/middleware/upload.middleware.js

const multer = require('multer');
const sharp = require('sharp');
const { uploadFileToR2 } = require('../services/r2.service.js');

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
    'application/vnd.ms-fontobject',
    'application/font-sfnt',
    'application/octet-stream'
];

const fileFilter = (req, file, cb) => {
    const allowedImageMimeTypes = file.mimetype.startsWith('image/');
    const allowedVideoMimeTypes = file.mimetype.startsWith('video/');
    const allowedFontMimeTypes = FONT_MIME_TYPES.includes(file.mimetype);
    const allowedZipMimeTypes = [
        'application/zip',
        'application/x-zip-compressed',
        'multipart/x-zip'
    ].includes(file.mimetype);

    if (allowedImageMimeTypes || allowedFontMimeTypes || allowedZipMimeTypes || allowedVideoMimeTypes) {
        cb(null, true);
    } else {
        if (file.originalname.toLowerCase().endsWith('.zip')) {
            cb(null, true);
            return;
        }
        cb(new Error('File không hợp lệ! Vui lòng chỉ tải lên ảnh, video, font chữ hoặc file .zip.'), false);
    }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
      fileSize: 1024 * 1024 * 100, // Tăng giới hạn lên 100MB mỗi file
  },
});

const resizeImage = async (req, res, next) => {
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

const uploadImageToR2 = async (req, res, next) => {
  if (!req.file || req.files) {
    return next();
  }

  try {
    const { buffer, mimetype, originalname } = req.file;
    const cfData = await uploadFileToR2(buffer, mimetype, originalname);

    req.file.cfUrl = cfData.url;
    req.file.cfId = cfData.id; // Nếu R2 trả về ID

    next();
  } catch (error) {
    console.error('Error uploading image:', error);
    next(error);
  }
}

// Thay thế `export` bằng `module.exports`
module.exports = {
    upload,
    resizeImage,
    uploadImageToR2
};