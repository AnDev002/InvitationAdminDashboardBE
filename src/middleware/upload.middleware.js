// src/middleware/upload.middleware.js
import multer from 'multer';
import sharp from 'sharp';
// --- THÊM DÒNG NÀY ---
import { uploadFileToR2 } from '../services/r2.service.js';

// Cấu hình multer để lưu file trong memory
const storage = multer.memoryStorage();

// Lọc file, chỉ cho phép upload ảnh
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, // Giới hạn 5MB
});

// Middleware để resize ảnh
export const resizeImage = async (req, res, next) => {
  if (!req.file) {
    return next(); // Không có file, bỏ qua
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
  if (!req.file) {
    return next(); // Không có file, bỏ qua
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