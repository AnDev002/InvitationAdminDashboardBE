const InvitationTemplate = require('../models/invitationTemplate.model');

const queryInvitationTemplates = (filter) => {
  return InvitationTemplate.find(filter);
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

const bulkCreateTemplates = async (templates) => {
  // `ordered: false` cho phép tiếp tục insert các bản ghi hợp lệ khác dù có lỗi (vd: trùng title)
  // `rawResult: true` để có kết quả chi tiết
  return await InvitationTemplate.insertMany(templates, { ordered: false });
};
module.exports = {
  queryInvitationTemplates,
  getTemplateById,
  createTemplate,
  updateTemplateById,
  deleteTemplateById,
  getUniqueCategories,
  bulkCreateTemplates,
};