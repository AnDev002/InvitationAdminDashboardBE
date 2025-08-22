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

// Lọc file, cho phép upload ảnh HOẶC FONT
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || FONT_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File không hợp lệ! Vui lòng chỉ tải lên ảnh hoặc font chữ.'), false);
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


// Middleware để resize ảnh
export const resizeImage = async (req, res, next) => {
  // ++ THAY ĐỔI: Bỏ qua resize nếu có nhiều file (cho content blocks)
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

// --- TẠO MIDDLEWARE MỚI ĐỂ UPLOAD LÊN R2 ---
export const uploadImageToR2 = async (req, res, next) => {
  // ++ THAY ĐỔI: Bỏ qua nếu có nhiều file (sẽ được xử lý trong controller)
  if (!req.file || req.files) {
    return next(); // Không có file hoặc có nhiều file, bỏ qua
  }

  try {
    const { buffer, mimetype } = req.file;
    const r2Data = await uploadFileToR2(buffer, mimetype);

    // Gắn URL của R2 vào request để controller có thể sử dụng
    req.file.r2Url = r2Data.url;
    req.file.r2Key = r2Data.key; // Lưu lại key để có thể xóa file sau này

    next();
  } catch (error) {
    console.error('Error uploading image to R2:', error);
    next(error);
  }
}