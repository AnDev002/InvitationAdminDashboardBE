const User = require('../models/user.model');

const getAllUsers = async () => {
  return await User.find().select('-password');
};

const createUser = async (userData) => {

  const user = new User({
    ...userData,
    password: userData.password,
  });

  return await user.save();
};


const getUserById = async (id) => {
  return await User.findById(id).select('-password');
};

const findUserByEmail = async (email) => {
    return await User.findOne({ email }).select('+password');
};

const changeUserPassword = async (userId, currentPassword, newPassword) => {
    // Lấy user và cả password hash
    const user = await User.findById(userId).select('+password');
    if (!user) {
        throw new Error('Không tìm thấy người dùng.');
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
        throw new Error('Mật khẩu hiện tại không chính xác.');
    }

    // Hash và cập nhật mật khẩu mới (middleware .pre('save') sẽ tự động hash)
    user.password = newPassword;
    await user.save();
};

const findUserByUsernameOrEmail = async (loginIdentifier) => {
    // Kiểm tra xem chuỗi nhập vào có phải là email không
    const isEmail = loginIdentifier.includes('@');
    
    const query = isEmail ? { email: loginIdentifier } : { username: loginIdentifier };
    
    return await User.findOne(query).select('+password');
};

/**
 * ++ MỚI: Cập nhật người dùng bởi ID ++
 * @param {string} userId - ID của người dùng cần cập nhật
 * @param {object} updateBody - Các trường cần cập nhật
 * @returns {Promise<User>}
 */
const updateUser = async (userId, updateBody) => {
    const user = await userModel.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy người dùng');
    }
    
    // Cập nhật các trường được phép
    Object.assign(user, updateBody);

    await user.save();
    return user;
};

/**
 * ++ MỚI: Xóa người dùng bởi ID ++
 * @param {string} userId - ID của người dùng cần xóa
 * @returns {Promise<void>}
 */
const deleteUser = async (userId) => {
    const user = await userModel.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy người dùng');
    }
    await user.deleteOne(); // Sử dụng deleteOne() để xóa document
};
module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  findUserByEmail,
  changeUserPassword,
  findUserByUsernameOrEmail,
  updateUser, 
  deleteUser,
};
