// AdminBE/services/invitationTemplate.service.js

const InvitationTemplate = require('../models/invitationTemplate.model');
const { uploadFileToR2 } = require('./r2.service'); 
const _ = require('lodash');

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

    // 1. Gán các trường dữ liệu văn bản/JSON thông thường
    template.title = updateData.title;
    template.category = updateData.category;
    template.group = updateData.group;
    template.type = updateData.type;
    template.description = updateData.description;
    template.isActive = updateData.isActive;
    template.loveGiftsButton = updateData.loveGiftsButton;
    
    const templateDataObject = updateData.templateData;

    // 2. Xử lý file upload nếu có
    if (files && files.length > 0) {
        const fileUrlMap = new Map();

        // Tải song song tất cả file lên R2 và tạo bản đồ tra cứu theo fieldname
        await Promise.all(
            files.map(async (file) => {
                const result = await uploadFileToR2(file.buffer, file.mimetype);
                // Sử dụng fieldname làm key, vì nó là duy nhất và được gửi từ frontend
                fileUrlMap.set(file.fieldname, result.url);
            })
        );
        
        // --- LOGIC SỬA LỖI BẮT ĐẦU TỪ ĐÂY ---

        // 3. Cập nhật URL ảnh đại diện template (nếu có)
        if (fileUrlMap.has('image')) {
            template.imgSrc = fileUrlMap.get('image');
        }

        // 4. Duyệt qua các trang (pages) và thay thế placeholder của ảnh nền
        if (templateDataObject.pages && Array.isArray(templateDataObject.pages)) {
            templateDataObject.pages.forEach(page => {
                const placeholder = page.backgroundImage;
                // Placeholder được gửi từ frontend có dạng: __FILE_PLACEHOLDER_background_pageId__
                if (placeholder && typeof placeholder === 'string' && placeholder.startsWith('__FILE_PLACEHOLDER_')) {
                    // Trích xuất fieldname từ placeholder
                    const fileKey = placeholder.replace('__FILE_PLACEHOLDER_', '').replace(/__$/, '');
                    if (fileUrlMap.has(fileKey)) {
                        page.backgroundImage = fileUrlMap.get(fileKey);
                    }
                }
            });
        }
        
        // 5. (Phần này đã sửa ở lượt trước, giữ lại để đảm bảo các ảnh khác vẫn hoạt động)
        // Duyệt qua settings và thay thế placeholder
        const settings = templateDataObject.settings;
        if (settings) {
            const processField = (path) => {
                const placeholder = _.get(settings, path);
                if (placeholder && typeof placeholder === 'string' && placeholder.startsWith('__FILE_PLACEHOLDER_')) {
                    const fieldName = placeholder.replace('__FILE_PLACEHOLDER_', '').replace(/__$/, '');
                    if (fileUrlMap.has(fieldName)) {
                        _.set(settings, path, fileUrlMap.get(fieldName));
                    }
                }
            };
            
            ['groomImageUrl', 'brideImageUrl', 'heroImages.main', 'heroImages.sub1', 'heroImages.sub2'].forEach(processField);

            const processList = (path, keyInObject = 'url') => {
                 const items = _.get(settings, path);
                 if (!Array.isArray(items)) return;

                 const newItems = items.map(item => {
                     const value = (typeof item === 'object' && item !== null) ? item[keyInObject] : item;
                     if (typeof value === 'string' && value.startsWith('__FILE_PLACEHOLDER_')) {
                         const fieldName = value.replace('__FILE_PLACEHOLDER_', '').replace(/__$/, '');
                         if (fileUrlMap.has(fieldName)) {
                             if (typeof item === 'object') {
                                 return { ...item, [keyInObject]: fileUrlMap.get(fieldName) };
                             }
                             return fileUrlMap.get(fieldName);
                         }
                     }
                     return item;
                 });
                 _.set(settings, path, newItems);
            };

            processList('galleryImages', null);
            processList('bannerImages', null);
            processList('events', 'imageUrl');
            processList('participants', 'imageUrl');
            processList('loveStory', 'imageUrl');
            processList('qrCodes', 'url');
        }
    }

    // 6. Gán đối tượng templateData đã được cập nhật đầy đủ và lưu vào DB
    template.templateData = templateDataObject;
    template.markModified('templateData');

    await template.save();
    return template;
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

const getUniqueGroupsForCategory = async (category) => {
  return await InvitationTemplate.distinct('group', { category: category }).where('group').ne(null).ne('');
};

const getUniqueTypesForCategoryAndGroup = async (category, group) => {
  return await InvitationTemplate.distinct('type', { category: category, group: group }).where('type').ne(null).ne('');
};

const bulkCreateTemplates = async (templates) => {
  return await InvitationTemplate.insertMany(templates, { ordered: false });
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
};