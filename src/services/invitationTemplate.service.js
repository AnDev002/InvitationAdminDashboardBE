// AdminBE/services/invitationTemplate.service.js
const InvitationTemplate = require('../models/invitationTemplate.model');
const { uploadFileToCloudflare } = require('./cloudflare.service'); 
const sharp = require('sharp');
const axios = require('axios');

function sanitizeCssValue(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/["';]/g, '');
}

const queryInvitationTemplates = (filter) => {
  return InvitationTemplate.find({ ...filter }).sort({ displayOrder: 1, createdAt: -1 });
};

const getTemplateById = async (id) => {
  return await InvitationTemplate.findById(id);
};

const createTemplate = async (templateData) => {
  return await InvitationTemplate.create(templateData);
};

const updateTemplateById = async (id, updateData, files = []) => {
    const template = await InvitationTemplate.findById(id);
    if (!template) {
        throw new Error('Không tìm thấy mẫu thiệp để cập nhật.');
    }

    // Directly assign properties from updateData
    Object.assign(template, {
        title: updateData.title,
        category: updateData.category,
        group: updateData.group,
        type: updateData.type,
        description: updateData.description,
        isActive: updateData.isActive,
        loveGiftsButton: updateData.loveGiftsButton,
        templateData: updateData.templateData
    });
    
    // Check for a new thumbnail file and upload it
    const thumbnailFile = files.find(f => f.fieldname === 'generatedThumbnail');
    if (thumbnailFile) {
        // Assuming uploadFileToCloudflare handles buffer and returns { url }
        const { url: newThumbnailUrl } = await uploadFileToCloudflare(thumbnailFile.buffer, thumbnailFile.mimetype);
        template.imgSrc = newThumbnailUrl; 
    }
    
    // Mark templateData as modified since it's a mixed type
    template.markModified('templateData');
    await template.save();
    
    // Return the updated document
    return await InvitationTemplate.findById(id);
};


const deleteTemplateById = async (id) => {
  await InvitationTemplate.findByIdAndDelete(id);
};

const getUniqueCategories = async () => {
  return await InvitationTemplate.distinct('category');
};

const getUniqueTypesForCategory = async (category) => {
  return await InvitationTemplate.distinct('type', { category: category });
};

const getUniqueGroups = async () => {
  return await InvitationTemplate.distinct('group').where('group').ne(null).ne('');
};

const getUniqueGroupsForCategory = async (category) => {
  return await InvitationTemplate.distinct('group', { category: category }).where('group').ne(null).ne('');
};

const getUniqueTypesForCategoryAndGroup = async (category, group) => {
  return await InvitationTemplate.distinct('type', { category: category, group: group }).where('type').ne(null).ne('');
};

const bulkCreateTemplates = async (templatesToCreate) => {
    if (!templatesToCreate || templatesToCreate.length === 0) {
        return [];
    }

    const incomingTitles = templatesToCreate.map(t => t.title);
    const incomingSlugs = templatesToCreate.map(t => t.slug);

    const titlesInFile = new Set();
    const slugsInFile = new Set();
    const duplicatesInFile = new Set();

    for (const template of templatesToCreate) {
        if (titlesInFile.has(template.title)) {
            duplicatesInFile.add(template.title);
        } else {
            titlesInFile.add(template.title);
        }
        if (slugsInFile.has(template.slug)) {
            duplicatesInFile.add(template.title);
        } else {
            slugsInFile.add(template.slug);
        }
    }

    const existingTemplates = await InvitationTemplate.find({
        $or: [
            { title: { $in: incomingTitles } },
            { slug: { $in: incomingSlugs } }
        ]
    }).select('title');

    const existingTitlesInDb = new Set(existingTemplates.map(t => t.title));
    const allDuplicateTitles = [...new Set([...duplicatesInFile, ...existingTitlesInDb])];

    if (allDuplicateTitles.length > 0) {
        const error = new Error(`Phát hiện ${allDuplicateTitles.length} tiêu đề hoặc slug đã tồn tại/bị trùng lặp.`);
        error.name = 'DuplicateTitlesError';
        error.duplicates = allDuplicateTitles;
        throw error;
    }
    
    return await InvitationTemplate.insertMany(templatesToCreate, { ordered: false });
};

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

const bulkDeleteTemplatesByFilter = async (filter) => {
    if (!filter || Object.keys(filter).length === 0) {
        throw new Error('Cần có bộ lọc để xóa hàng loạt.');
    }
    const query = Object.entries(filter).reduce((acc, [key, value]) => {
        if (value && value !== 'all') {
            acc[key] = value;
        }
        return acc;
    }, {});

    if (Object.keys(query).length === 0) {
        throw new Error('Bộ lọc không hợp lệ để thực hiện xóa.');
    }

    const result = await InvitationTemplate.deleteMany(query);
    return result;
};

module.exports = {
  queryInvitationTemplates,
  getTemplateById,
  createTemplate,
  updateTemplateById,
  deleteTemplateById,
  getUniqueCategories,
  getUniqueTypesForCategory,
  bulkCreateTemplates,
  incrementTemplateView,
  getUniqueGroups: async () => await InvitationTemplate.distinct('group').where('group').ne(null).ne(''),
  getUniqueGroupsForCategory,
  getUniqueTypesForCategoryAndGroup,
  reorderTemplates,
  bulkDeleteTemplatesByFilter,
};