const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
  let token;

  // 1. Đọc token từ httpOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  // 2. Nếu không có token trong cookie, trả về lỗi
  // Dòng này chính là nơi sinh ra lỗi của bạn
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    // 3. Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Lấy thông tin user từ DB (không lấy password) và gắn vào request
    // để các hàm controller sau có thể sử dụng (ví dụ: req.user.id)
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found' });
    }

    next(); // Cho phép đi tiếp đến controller
  } catch (error) {
    // Bắt lỗi nếu token không hợp lệ hoặc hết hạn
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // req.user được gán từ middleware `protect`
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };