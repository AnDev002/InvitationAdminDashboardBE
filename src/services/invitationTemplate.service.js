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


module.exports = {
  queryInvitationTemplates,
  getTemplateById,
  createTemplate,
  updateTemplateById,
  deleteTemplateById,
};