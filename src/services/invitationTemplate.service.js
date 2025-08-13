const InvitationTemplate = require('../models/invitationTemplate.model');

const queryInvitationTemplates = (filter) => {
  return InvitationTemplate.find({ ...filter, isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
};

// HÀM MỚI
const getTemplateById = async (id) => {
  return await InvitationTemplate.findById(id);
};

// HÀM MỚI
const createTemplate = async (templateData) => {
  return await InvitationTemplate.create(templateData);
};

// HÀM MỚI
const updateTemplateById = async (id, updateData) => {
  return await InvitationTemplate.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
};

// HÀM MỚI
const deleteTemplateById = async (id) => {
  await InvitationTemplate.findByIdAndDelete(id);
};

const getUniqueCategories = async () => {
  // Sử dụng `distinct` để lấy các giá trị không trùng lặp của trường 'category'
  return await InvitationTemplate.distinct('category');
};

// ++ BẮT ĐẦU THÊM MỚI ++
/**
 * Lấy danh sách các 'type' duy nhất cho một category cụ thể.
 * @param {string} category - Tên của category.
 * @returns {Promise<Array<string>>}
 */
const getUniqueTypesForCategory = async (category) => {
  return await InvitationTemplate.distinct('type', { category: category });
};

// ++ KẾT THÚC THÊM MỚI ++

const getUniqueGroups = async () => {
  return await InvitationTemplate.distinct('group').where('group').ne(null).ne('');
};

const getUniqueGroupsForCategory = async (category) => {
  return await InvitationTemplate.distinct('group', { category: category }).where('group').ne(null).ne('');
};

/**
 * ++ HÀM MỚI ++
 * Lấy danh sách các 'type' duy nhất cho một category và group cụ thể.
 * @param {string} category - Tên của category.
 * @param {string} group - Tên của group.
 * @returns {Promise<Array<string>>}
 */
const getUniqueTypesForCategoryAndGroup = async (category, group) => {
  return await InvitationTemplate.distinct('type', { category: category, group: group }).where('type').ne(null).ne('');
};

const bulkCreateTemplates = async (templates) => {
  // `ordered: false` cho phép tiếp tục insert các bản ghi hợp lệ khác dù có lỗi (vd: trùng title)
  // `rawResult: true` để có kết quả chi tiết
  return await InvitationTemplate.insertMany(templates, { ordered: false });
};
/**
 * ++ HÀM MỚI ++
 * Tăng số lượt xem của mẫu thiệp lên 1.
 * @param {string} templateId - ID của mẫu thiệp.
 */
const incrementTemplateView = async (templateId) => {
  return await InvitationTemplate.findByIdAndUpdate(templateId, { $inc: { views: 1 } });
};

const reorderTemplates = async (templateIds) => {
    const bulkOps = templateIds.map((id, index) => ({
        updateOne: {
            filter: { _id: id },
            update: { $set: { displayOrder: index + 1 } },
        },
    }));
    return await InvitationTemplate.bulkWrite(bulkOps);
};


module.exports = {
  queryInvitationTemplates,
  getTemplateById,
  createTemplate,
  updateTemplateById,
  deleteTemplateById,
  getUniqueCategories,
  getUniqueTypesForCategory, // Ta sẽ dùng hàm mới cho cả hai trường hợp
  bulkCreateTemplates,
  incrementTemplateView,
  getUniqueGroups: async () => await InvitationTemplate.distinct('group').where('group').ne(null).ne(''),
  getUniqueGroupsForCategory, // Export hàm mới
  getUniqueTypesForCategoryAndGroup, // Export hàm mới
  reorderTemplates,
};