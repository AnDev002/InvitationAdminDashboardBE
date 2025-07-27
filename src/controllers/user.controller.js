const userService = require('../services/user.service');
const { deleteFileFromR2 } = require('../services/r2.service.js');

const getUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

const updateMe = async (req, res, next) => {
    try {
    // Middleware 'protect' đã gắn user vào req.user
    const userId = req.user.id;

    // Lấy các trường có thể cập nhật từ body
    const { firstName, lastName, phone, address, bio, dob } = req.body;
    const updateData = { firstName, lastName, phone, address, bio, dob };
    
    // --- THAY ĐỔI Ở ĐÂY ---
    // Gọi đến service để cập nhật, thay vì tự thao tác với DB
    const updatedUser = await userService.updateUser(userId, updateData);

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    // Truyền lỗi cho errorHandler xử lý
    next(error);
  }
};
const updateAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    if (!req.file || !req.file.r2Url) {
      return res.status(400).json({ message: 'Please upload an image file.' });
    }

    // --- TỰ ĐỘNG XÓA AVATAR CŨ TRÊN R2 ---
    const oldAvatarUrl = req.user.avatar; 
    // Kiểm tra xem có avatar cũ không và đó có phải là link từ R2 không
    if (oldAvatarUrl && oldAvatarUrl.includes(process.env.R2_PUBLIC_URL)) {
        // Trích xuất 'key' của file từ URL
        const oldFileKey = oldAvatarUrl.split('/').pop();
        if(oldFileKey) {
          await deleteFileFromR2(oldFileKey);
        }
    }
    // --- KẾT THÚC ---

    // Lấy URL của avatar mới từ middleware
    const newAvatarUrl = req.file.r2Url;

    // Cập nhật CSDL với URL mới
    const updatedUser = await userService.updateUser(userId, { avatar: newAvatarUrl });

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully.',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};


const changePassword = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        await userService.changeUserPassword(userId, currentPassword, newPassword);

        res.status(200).json({
            success: true,
            message: 'Đổi mật khẩu thành công.',
        });
    } catch (error) {
        // Tạo lỗi tùy chỉnh để frontend dễ bắt
        if (error.message.includes('không chính xác')) {
            return res.status(401).json({ message: error.message });
        }
        next(error);
    }
};

module.exports = {
  getUsers,
  createUser,
  getUser,
  getMe,
  updateMe,
  updateAvatar,
  changePassword,
};
