// AdminBE/services/pageCategory.service.js
const PageCategory = require('../models/pageCategory.model');

// Sửa nhẹ: Thêm .populate('parent', 'name') để Frontend hiển thị được tên danh mục cha
const getAllCategories = () => {
    return PageCategory.find()
        .populate('parent', 'name') // Quan trọng: Để hiển thị tên cha
        .sort('order');             // Quan trọng: Để sắp xếp theo order
};

const getCategoryById = (id) => PageCategory.findById(id).populate('parent', 'name');

const createCategory = (data) => {
    return PageCategory.create(data);
};

const updateCategory = (id, data) => {
    return PageCategory.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

// Sửa nhẹ: Trước khi xóa cha, set parent của các con về null để tránh lỗi orphan data
const deleteCategory = async (id) => {
    // Set parent = null cho các danh mục con của danh mục bị xóa
    await PageCategory.updateMany({ parent: id }, { parent: null });
    return PageCategory.findByIdAndDelete(id);
};

// Giữ nguyên hoàn toàn hàm này của bạn
const updateCategoryOrder = (categories) => {
    const promises = categories.map((cat, index) => {
        // Cập nhật order theo index trong mảng gửi lên
        return PageCategory.findByIdAndUpdate(cat.id || cat._id, { order: index });
    });
    return Promise.all(promises);
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    updateCategoryOrder,
};