// AdminBE/middleware/upload.middleware.js

const multer = require('multer');
const sharp = require('sharp');
const { uploadFileToR2 } = require('../services/r2.service.js');
// === START: MODIFICATION ===
// Import dịch vụ Cloudflare Images THỰC SỰ (đã sửa ở bước 1)
const { uploadFileToCloudflare: uploadToCfImages } = require('../services/cloudflare.service.js');
// === END: MODIFICATION ===


// ... (storage, FONT_MIME_TYPES, fileFilter, upload, resizeImage giữ nguyên) ...
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
      fileSize: 1024 * 1024 * 500, 
      files: 200
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

// Hàm này dùng cho R2 (fonts, videos), giữ nguyên
const uploadImageToR2 = async (req, res, next) => {
  if (!req.file || req.files) {
    return next();
  }
  try {
    const { buffer } = req.file;
    const cfData = await uploadFileToR2(buffer, req.file.mimetype, req.file.originalname);
    req.file.cfUrl = cfData.url;
    req.file.cfId = cfData.id; // (hoặc key)
    next();
  } catch (error) {
    console.error('Lỗi khi tải ảnh lên R2:', error);
    next(error);
  }
}

// === START: MODIFICATION ===
// Sửa hàm này để nó gọi Cloudflare Images (uploadToCfImages)
const uploadImageToCloudflare = async (req, res, next) => {
  if (!req.file || req.files) {
    return next();
  }

  try {
    const { buffer } = req.file;
    // Gọi dịch vụ Cloudflare Images đã được import
    const cfData = await uploadToCfImages(buffer, req.file.mimetype);

    // Gắn URL và ID của Cloudflare Images vào request
    req.file.cfUrl = cfData.url;
    req.file.cfId = cfData.id; 

    next();
  } catch (error) {
    console.error('Error uploading image to Cloudflare Images:', error);
    next(error);
  }
}
// === END: MODIFICATION ===

module.exports = {
  upload,
  resizeImage,
  uploadImageToCloudflare, // (Giờ đã trỏ đến Cloudflare Images)
  uploadImageToR2 // (Vẫn trỏ đến R2)
};