const InvitationTemplate = require('../models/invitationTemplate.model');
const { uploadFileToR2 } = require('./r2.service'); 

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

    // Gán các trường dữ liệu văn bản/JSON thông thường
    template.title = updateData.title;
    template.category = updateData.category;
    template.group = updateData.group;
    template.type = updateData.type;
    template.description = updateData.description;
    template.isActive = updateData.isActive;
    template.loveGiftsButton = updateData.loveGiftsButton;
    
    // Lấy đối tượng templateData từ payload
    const templateDataObject = updateData.templateData;

    // Xử lý file upload nếu có
    if (files && files.length > 0) {
        const fileUrlMap = new Map();

        // Tải song song tất cả file lên R2
        await Promise.all(
            files.map(async (file) => {
                const result = await uploadFileToR2(file.buffer, file.mimetype);
                fileUrlMap.set(file.fieldname, result.url);
            })
        );

        // --- BẮT ĐẦU SỬA LỖI ---
        // Hàm trợ giúp để tìm và thay thế placeholder hoặc giá trị null bằng URL thật
        const processImageField = (path) => {
            const fieldName = path.replace(/\./g, '__'); // Chuyển đổi 'a.b' thành 'a__b' để khớp fieldname
            if (fileUrlMap.has(fieldName)) {
                _.set(templateDataObject.settings, path, fileUrlMap.get(fieldName));
            }
        };

        const processImageList = (path, originalList) => {
            const formFieldName = path.replace(/\./g, '__'); // vd: eventImages
            const uploadedUrls = Array.from(fileUrlMap.keys())
                .filter(key => key.startsWith(formFieldName))
                .map(key => fileUrlMap.get(key));

            let finalList = [];
            if (Array.isArray(originalList)) {
                // Giữ lại các URL cũ không phải là placeholder
                finalList = originalList.filter(item => 
                    item && (typeof item === 'string' || (typeof item === 'object' && item.url && !item.url.startsWith('__FILE_PLACEHOLDER_')))
                );
            }
            
            // Xử lý các mục có chứa placeholder và thay thế
            if (Array.isArray(originalList)) {
                 originalList.forEach(item => {
                    if(item && typeof item === 'object' && item.url && item.url.startsWith('__FILE_PLACEHOLDER_')) {
                        // Tìm URL tương ứng đã upload
                        const matchingUrl = uploadedUrls.find(url => url.includes(item.url.split('_').pop()));
                        if(matchingUrl) {
                            finalList.push({...item, url: matchingUrl});
                        }
                    }
                 });
            }


            // Thêm các URL mới đã upload
             uploadedUrls.forEach(url => {
                // Logic để tránh thêm trùng lặp nếu cần
                finalList.push(url);
             });
            
             // Cập nhật lại settings
            _.set(templateDataObject.settings, path, finalList);
        };
        
        // Cập nhật ảnh đại diện template
        if (fileUrlMap.has('image')) {
            template.imgSrc = fileUrlMap.get('image');
        }

        // Cập nhật các ảnh trong settings
        processImageField('groomImageUrl');
        processImageField('brideImageUrl');
        processImageField('heroImages.main');
        processImageField('heroImages.sub1');
        processImageField('heroImages.sub2');

        // Xử lý các danh sách ảnh
        processImageList('galleryImages', _.get(templateDataObject, 'settings.galleryImages'));
        processImageList('bannerImages', _.get(templateDataObject, 'settings.bannerImages'));
        processImageList('eventImages', _.get(templateDataObject, 'settings.events', []).map(e => e.imageUrl));
        
        // Cập nhật lại URL cho events, participants, loveStory, qrCodes
        ['events', 'participants', 'loveStory'].forEach(key => {
            const items = _.get(templateDataObject.settings, key, []);
            if(Array.isArray(items)) {
                items.forEach(item => {
                    const fieldName = `${key}__${item.id}__imageUrl`;
                    if (fileUrlMap.has(fieldName)) {
                        item.imageUrl = fileUrlMap.get(fieldName);
                    }
                });
            }
        });
        const qrItems = _.get(templateDataObject.settings, 'qrCodes', []);
        if(Array.isArray(qrItems)) {
            qrItems.forEach(item => {
                const fieldName = `qrCodes__${item.id}__url`;
                if(fileUrlMap.has(fieldName)){
                    item.url = fileUrlMap.get(fieldName);
                }
            });
        }


        // Duyệt qua các trang và thay thế placeholder của ảnh nền
        if (templateDataObject.pages && Array.isArray(templateDataObject.pages)) {
            templateDataObject.pages.forEach(page => {
                const fileKey = `background_${page.id}`;
                if (fileUrlMap.has(fileKey)) {
                    page.backgroundImage = fileUrlMap.get(fileKey);
                }
            });
        }
        // --- KẾT THÚC SỬA LỖI ---
    }
    
    // Gán đối tượng templateData đã được cập nhật đầy đủ vào document
    template.templateData = templateDataObject;
    
    // Đánh dấu là đã chỉnh sửa để Mongoose biết cần lưu
    template.markModified('templateData');

    // Lưu tất cả thay đổi vào database
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