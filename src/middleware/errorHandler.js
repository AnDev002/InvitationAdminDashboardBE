// AdminBE/middleware/errorHandler.js
const AppError = require('../utils/AppError');

// Gửi lỗi chi tiết khi ở môi trường development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// Gửi lỗi thân thiện khi ở môi trường production
const sendErrorProd = (err, res) => {
  // A) Lỗi vận hành, có thể dự đoán được: gửi thông báo cho client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  // B) Lỗi lập trình hoặc lỗi không xác định: không rò rỉ chi tiết
  // 1) Ghi log lỗi để lập trình viên biết
  console.error('ERROR 💥', err);
  // 2) Gửi thông báo chung chung cho client
  return res.status(500).json({
    status: 'error',
    message: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
  });
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else { // Môi trường Production
    let error = { ...err };
    error.message = err.message;

    // Chuyển đổi các lỗi phổ biến từ DB/JWT thành lỗi AppError thân thiện
    if (error.code === 11000) error = new AppError('Dữ liệu bạn nhập đã bị trùng lặp. Vui lòng kiểm tra lại.', 409);
    if (error.name === 'ValidationError') error = new AppError(Object.values(error.errors).map(el => el.message).join('. '), 400);
    if (error.name === 'JsonWebTokenError') error = new AppError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.', 401);
    if (error.name === 'TokenExpiredError') error = new AppError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
    // BẮT ĐẦU THAY ĐỔI: Xử lý MulterError
    if (error.name === 'MulterError') {
        if (error.code === 'LIMIT_FILE_SIZE') {
            error = new AppError('Một trong các tệp có dung lượng quá lớn. Vui lòng kiểm tra lại.', 400);
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            error = new AppError('Bạn đã tải lên quá nhiều tệp cùng lúc. Vui lòng thử lại với số lượng ít hơn.', 400);
        }
        if (error.code === 'LIMIT_FIELD_COUNT') {
            error = new AppError('Bạn đã gửi quá nhiều trường trong form. Vui lòng kiểm tra lại.', 400);
        }
    }
    // KẾT THÚC THAY ĐỔI

    sendErrorProd(error, res);
  }
};

module.exports = errorHandler;