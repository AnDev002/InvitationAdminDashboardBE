const InvitationTemplate = require('../models/invitationTemplate.model');
const { uploadFileToR2 } = require('./r2.service'); 
const sharp = require('sharp');

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

    template.title = updateData.title;
    template.category = updateData.category;
    template.group = updateData.group;
    template.type = updateData.type;
    template.description = updateData.description;
    template.isActive = updateData.isActive;
    template.loveGiftsButton = updateData.loveGiftsButton;
    
    const templateDataObject = updateData.templateData;

    if (files && files.length > 0) {
        const fileUrlMap = new Map();
        const uploadPromises = files.map(async (file) => {
            const processedBuffer = await sharp(file.buffer)
                .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer();
            const { url } = await uploadFileToR2(processedBuffer, 'image/webp');

            if (!fileUrlMap.has(file.fieldname)) {
                fileUrlMap.set(file.fieldname, []);
            }
            fileUrlMap.get(file.fieldname).push(url);
        });
        await Promise.all(uploadPromises);

        if (templateDataObject.pages && Array.isArray(templateDataObject.pages)) {
            templateDataObject.pages.forEach(page => {
                const fieldName = `background_${page.id}`;
                if (fileUrlMap.has(fieldName)) {
                    page.backgroundImage = fileUrlMap.get(fieldName)[0];
                }
            });
        }
        
        const settingsObject = templateDataObject.settings || {};
        const replacePlaceholdersInArray = (arr, fieldName, imageKey) => {
            if (Array.isArray(arr) && fileUrlMap.has(imageKey)) {
                let urlIndex = 0;
                return arr.map(item => {
                    if (item[fieldName] && String(item[fieldName]).startsWith('__FILE_PLACEHOLDER_')) {
                        const newUrl = fileUrlMap.get(imageKey)[urlIndex];
                        if (newUrl) {
                            urlIndex++;
                            return { ...item, [fieldName]: newUrl };
                        }
                    }
                    return item;
                });
            }
            return arr;
        };

        if (fileUrlMap.has('groomImageUrl')) settingsObject.groomImageUrl = fileUrlMap.get('groomImageUrl')[0];
        if (fileUrlMap.has('brideImageUrl')) settingsObject.brideImageUrl = fileUrlMap.get('brideImageUrl')[0];
        
        settingsObject.events = replacePlaceholdersInArray(settingsObject.events, 'imageUrl', 'eventImages');
        settingsObject.participants = replacePlaceholdersInArray(settingsObject.participants, 'imageUrl', 'participantImages');
        settingsObject.loveStory = replacePlaceholdersInArray(settingsObject.loveStory, 'imageUrl', 'loveStoryImages');
        settingsObject.qrCodes = replacePlaceholdersInArray(settingsObject.qrCodes, 'url', 'qrCodeImageUrls');

        if (fileUrlMap.has('galleryImages')) {
            settingsObject.galleryImages = [
                ...(settingsObject.galleryImages || []).filter(img => !String(img).startsWith('__FILE_PLACEHOLDER_')),
                ...fileUrlMap.get('galleryImages')
            ];
        }
        if (fileUrlMap.has('bannerImages')) {
            settingsObject.bannerImages = [
                ...(settingsObject.bannerImages || []).filter(item => item.url),
                ...fileUrlMap.get('bannerImages').map(url => ({ id: url, url }))
            ];
        }

        templateDataObject.settings = settingsObject;
    }
    
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

const getUniqueGroups = async () => {
  return await InvitationTemplate.distinct('group').where('group').ne(null).ne('');
};

const getUniqueGroupsForCategory = async (category) => {
  return await InvitationTemplate.distinct('group', { category: category }).where('group').ne(null).ne('');
};

const getUniqueTypesForCategoryAndGroup = async (category, group) => {
  return await InvitationTemplate.distinct('type', { category: category, group: group }).where('type').ne(null).ne('');
};

// --- HÀM ĐÃ ĐƯỢC CẬP NHẬT ---
const bulkCreateTemplates = async (templatesToCreate) => {
    if (!templatesToCreate || templatesToCreate.length === 0) {
        return [];
    }

    // 1. Lấy tất cả các tiêu đề từ dữ liệu đầu vào
    const incomingTitles = templatesToCreate.map(t => t.title);

    // 2. Kiểm tra xem có tiêu đề nào đã tồn tại trong DB không
    const existingTemplates = await InvitationTemplate.find({ title: { $in: incomingTitles } }).select('title');
    const existingTitles = new Set(existingTemplates.map(t => t.title));

    // 3. Lọc ra các mẫu không bị trùng lặp và các mẫu bị trùng
    const newTemplates = templatesToCreate.filter(t => !existingTitles.has(t.title));
    const duplicateTitles = incomingTitles.filter(title => existingTitles.has(title));

    // 4. Nếu có tiêu đề trùng lặp, ném lỗi với thông tin chi tiết
    if (duplicateTitles.length > 0) {
        const error = new Error(`Phát hiện ${duplicateTitles.length} tiêu đề đã tồn tại trong cơ sở dữ liệu.`);
        error.name = 'DuplicateTitlesError';
        error.duplicates = [...new Set(duplicateTitles)]; // Đảm bảo danh sách là duy nhất
        throw error;
    }

    // 5. Nếu tất cả đều là mẫu mới, tiến hành insert
    if (newTemplates.length > 0) {
        return await InvitationTemplate.insertMany(newTemplates, { ordered: false });
    }

    return [];
};
// --- KẾT THÚC CẬP NHẬT ---

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