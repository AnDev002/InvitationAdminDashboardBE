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
        return { createdTemplates: [], duplicateTitles: [] };
    }

    // 1. Lấy tất cả các tiêu đề đến và chuẩn hóa (viết thường để so sánh không phân biệt hoa/thường)
    const incomingTitles = templatesToCreate.map(t => t.title);
    const lowercasedIncomingTitles = incomingTitles.map(t => t.toLowerCase());

    // 2. Tìm các tiêu đề đã tồn tại trong DB
    const existingTemplates = await InvitationTemplate.find({ 
        title: { $in: incomingTitles.map(t => new RegExp(`^${t}$`, 'i')) } // Tìm kiếm không phân biệt hoa/thường
    }).select('title');
    const lowercasedExistingTitlesInDb = new Set(existingTemplates.map(t => t.title.toLowerCase()));

    // 3. Lọc ra các mẫu hợp lệ để chèn
    const seenTitles = new Set();
    const duplicateTitles = new Set(lowercasedExistingTitlesInDb);
    const templatesToInsert = [];

    for (const template of templatesToCreate) {
        const lowercasedTitle = template.title.toLowerCase();
        // Kiểm tra xem tiêu đề đã có trong DB hoặc đã gặp trong file này chưa
        if (!lowercasedExistingTitlesInDb.has(lowercasedTitle) && !seenTitles.has(lowercasedTitle)) {
            templatesToInsert.push(template);
            seenTitles.add(lowercasedTitle);
        } else {
            // Nếu đã tồn tại hoặc trùng lặp trong file, thêm vào danh sách lỗi
            duplicateTitles.add(template.title); // Giữ lại tên gốc để báo lỗi
        }
    }

    // 4. Chèn các mẫu hợp lệ vào DB
    let createdTemplates = [];
    if (templatesToInsert.length > 0) {
        try {
            createdTemplates = await InvitationTemplate.insertMany(templatesToInsert, { ordered: false });
        } catch (error) {
            // Xử lý lỗi cuối cùng nếu có, mặc dù logic trên đã cố gắng ngăn chặn
            if (error.code === 11000 && error.writeErrors) {
                error.writeErrors.forEach(err => {
                    // Trích xuất tiêu đề bị trùng từ thông báo lỗi của MongoDB
                    const titleMatch = err.err.errmsg.match(/dup key: { title: "([^"]+)" }/);
                    if (titleMatch && titleMatch[1]) {
                        duplicateTitles.add(titleMatch[1]);
                    }
                });
            } else {
                // Ném lại lỗi nếu không phải lỗi trùng lặp
                throw error;
            }
        }
    }
    
    // 5. Trả về kết quả
    return {
        createdTemplates,
        duplicateTitles: Array.from(duplicateTitles),
    };
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

// --- HÀM MỚI ĐỂ XÓA HÀNG LOẠT ---
const bulkDeleteTemplatesByFilter = async (filter) => {
    if (!filter || Object.keys(filter).length === 0) {
        throw new Error('Cần có bộ lọc để xóa hàng loạt.');
    }
    // Lọc ra các giá trị null hoặc 'all' để tạo query Mongoose
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
// --- KẾT THÚC HÀM MỚI ---

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