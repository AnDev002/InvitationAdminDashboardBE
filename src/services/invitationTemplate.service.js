const InvitationTemplate = require('../models/invitationTemplate.model');
const { uploadFileToR2 } = require('./r2.service'); 
const sharp = require('sharp');

const queryInvitationTemplates = (filter) => {
  return InvitationTemplate.find({ ...filter }).sort({ displayOrder: 1, createdAt: -1 });
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
const updateTemplateById = async (id, updateData, files = []) => {
    const template = await InvitationTemplate.findById(id);
    if (!template) {
        throw new Error('Không tìm thấy mẫu thiệp để cập nhật.');
    }

    // 1. Gán các trường dữ liệu văn bản vào document Mongoose
    template.title = updateData.title;
    template.category = updateData.category;
    template.group = updateData.group;
    template.type = updateData.type;
    template.description = updateData.description;
    template.isActive = updateData.isActive;
    template.loveGiftsButton = updateData.loveGiftsButton;
    
    const templateDataObject = updateData.templateData;
const settingsObject = templateDataObject.settings || {};

    // --- PHẦN LOGIC CẦN THÊM BẮT ĐẦU TỪ ĐÂY ---
    if (files && files.length > 0) {
        const fileUrlMap = new Map();
        const uploadPromises = files.map(async (file) => {
            // Xử lý và tải file (ví dụ: resize, chuyển đổi định dạng)
            const processedBuffer = await sharp(file.buffer)
                .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer();
            const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
            
            // Map tên trường của file với URL đã tải lên
            // Ví dụ: file.fieldname là 'eventImages' hoặc 'groomImageUrl'
            if (!fileUrlMap.has(file.fieldname)) {
                fileUrlMap.set(file.fieldname, []);
            }
            fileUrlMap.get(file.fieldname).push(url);
        });
        await Promise.all(uploadPromises);

        // Hàm thay thế placeholder cho các mảng đối tượng (events, participants, ...)
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

        // Thay thế URL cho các ảnh đơn
        if (fileUrlMap.has('groomImageUrl')) settingsObject.groomImageUrl = fileUrlMap.get('groomImageUrl')[0];
        if (fileUrlMap.has('brideImageUrl')) settingsObject.brideImageUrl = fileUrlMap.get('brideImageUrl')[0];
        // ... thêm cho các ảnh đơn khác ...

        // Thay thế placeholder cho các mảng ảnh
        settingsObject.events = replacePlaceholdersInArray(settingsObject.events, 'imageUrl', 'eventImages');
        settingsObject.participants = replacePlaceholdersInArray(settingsObject.participants, 'imageUrl', 'participantImages');
        settingsObject.loveStory = replacePlaceholdersInArray(settingsObject.loveStory, 'imageUrl', 'loveStoryImages');
        settingsObject.qrCodes = replacePlaceholdersInArray(settingsObject.qrCodes, 'url', 'qrCodeImageUrls');

        // Xử lý các mảng chỉ chứa URL như gallery và banners
        if (fileUrlMap.has('galleryImages')) {
            settingsObject.galleryImages = [
                ...(settingsObject.galleryImages || []).filter(img => !String(img).startsWith('__FILE_PLACEHOLDER_')),
                ...fileUrlMap.get('galleryImages')
            ];
        }
        if (fileUrlMap.has('bannerImages')) {
            settingsObject.bannerImages = [
                ...(settingsObject.bannerImages || []).filter(item => item.url), // Giữ lại các URL cũ
                ...fileUrlMap.get('bannerImages').map(url => ({ id: url, url })) // Thêm các URL mới
            ];
        }
    }
    // --- KẾT THÚC PHẦN LOGIC CẦN THÊM ---

    template.templateData.settings = settingsObject;
    template.markModified('templateData'); // Đánh dấu để Mongoose biết đã thay đổi

    await template.save();
    return template;
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