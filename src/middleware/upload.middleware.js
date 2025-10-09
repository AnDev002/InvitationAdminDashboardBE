// AdminBE/middleware/upload.middleware.js

const multer = require('multer');
const sharp = require('sharp');
const uploadFileToR2 = require('../services/r2.service.js');

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

// === START: MODIFICATION ===
// Cập nhật fileFilter để chấp nhận video
const fileFilter = (req, file, cb) => {
    const allowedImageMimeTypes = file.mimetype.startsWith('image/');
    const allowedVideoMimeTypes = file.mimetype.startsWith('video/'); // Thêm dòng này
    const allowedFontMimeTypes = FONT_MIME_TYPES.includes(file.mimetype);
    const allowedZipMimeTypes = [
        'application/zip', 
        'application/x-zip-compressed', 
        'multipart/x-zip'
    ].includes(file.mimetype);

    // Thêm allowedVideoMimeTypes vào điều kiện if
    if (allowedImageMimeTypes || allowedFontMimeTypes || allowedZipMimeTypes || allowedVideoMimeTypes) {
        cb(null, true);
    } else {
        if (file.originalname.toLowerCase().endsWith('.zip')) {
            cb(null, true);
            return;
        }
        // Cập nhật thông báo lỗi
        cb(new Error('File không hợp lệ! Vui lòng chỉ tải lên ảnh, video, font chữ hoặc file .zip.'), false);
    }
};
// === END: MODIFICATION ===


// Tăng giới hạn file size cho video
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
      fileSize: 1024 * 1024 * 50, // Giới hạn 50MB mỗi file (cho video)
      files: 50 // Giới hạn 50 files mỗi request
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

const uploadImageToCloudflare = async (req, res, next) => {
  if (!req.file || req.files) {
    return next();
  }

  try {
    const { buffer } = req.file;
    // Lưu ý: Tên hàm uploadFileToCloudflare có thể cần đổi thành tên chung hơn 
    // như uploadFileToR2 nếu bạn dùng chung service
    const cfData = await uploadFileToR2(buffer, req.file.mimetype, req.file.originalname);

    // Gắn URL và ID của Cloudflare vào request
    req.file.cfUrl = cfData.url;
    req.file.cfId = cfData.id; // Nếu R2 trả về ID

    next();
  } catch (error) {
    console.error('Error uploading image to Cloudflare:', error);
    next(error);
  }
}

module.exports = {
  upload,
  resizeImage,
  uploadImageToCloudflare,
};