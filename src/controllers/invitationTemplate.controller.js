// AdminBE/controllers/invitationTemplate.controller.js

const mongoose = require('mongoose');
const InvitationTemplate = require('../models/invitationTemplate.model');
const Settings = require('../models/settings.model'); // ĐÃ THÊM: Import model Settings
const invitationTemplateService = require('../services/invitationTemplate.service');
const APIFeatures = require('../utils/apiFeature');
const sharp = require('sharp');
const { uploadFileToR2 } = require('../services/r2.service');

const processContentImages = async (htmlContent) => {
    // Regex để tìm các ảnh base64 hoặc placeholder trong nội dung
    const regex = /<img[^>]+src="data:image\/[^;]+;base64[^>]+"/g;
    const matches = htmlContent.match(regex);
    if (!matches) return htmlContent;
    
    let newHtmlContent = htmlContent;
    for (const imgTag of matches) {
        const base64Data = imgTag.match(/src="data:image\/[^;]+;base64,([^"]+)"/)[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const processedBuffer = await sharp(buffer)
            .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
        
        const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
        newHtmlContent = newHtmlContent.replace(imgTag, `<img src="${url}" />`);
    }
    return newHtmlContent;
};

const getInvitationTemplates = async (req, res, next) => {
    try {
        const { search } = req.query;
        let initialQuery = {};
        if (search) {
            initialQuery = { $or: [
                { title: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ]};
        }
        const features = new APIFeatures(invitationTemplateService.queryInvitationTemplates(initialQuery), req.query)
            .filter().sort().limitFields().paginate();
        const templates = await features.query;
        res.status(200).json({
            status: 'success',
            results: templates.length,
            data: templates,
        });
    } catch (error) {
        next(error);
    }
};

const getTemplateGroups = async (req, res, next) => {
    try {
        const { category } = req.query;
        // Nếu không có category, trả về mảng rỗng thay vì lỗi, để frontend xử lý dễ hơn
        if (!category) {
            return res.status(200).json({ status: 'success', data: [] });
        }
        const groups = await invitationTemplateService.getUniqueGroupsForCategory(category);
        res.status(200).json({
            status: 'success',
            data: groups,
        });
    } catch (error) {
        next(error);
    }
};



const getTemplateById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID mẫu thiệp không hợp lệ.' });
        }
        const template = await invitationTemplateService.getTemplateById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Không tìm thấy mẫu thiệp.' });
        }
        res.status(200).json({ status: 'success', data: template });
    } catch (error) {
        next(error);
    }
};

const createTemplate = async (req, res, next) => {
    try {
        let parsedTemplateData;
        if (typeof req.body.templateData === 'string') {
            try {
                parsedTemplateData = JSON.parse(req.body.templateData);
            } catch (e) {
                return res.status(400).json({ message: 'Dữ liệu templateData không phải là JSON hợp lệ.' });
            }
        } else {
            parsedTemplateData = req.body.templateData || {};
        }

        let parsedLoveGiftsButton = null;
        if (req.body.loveGiftsButton && typeof req.body.loveGiftsButton === 'string') {
            try {
                parsedLoveGiftsButton = JSON.parse(req.body.loveGiftsButton);
            } catch (e) {
                console.error("Lỗi parse loveGiftsButton khi tạo mới:", e);
            }
        }

        const newTemplatePayload = {
            ...req.body,
            templateData: parsedTemplateData,
            loveGiftsButton: parsedLoveGiftsButton,
        };

        if (req.file && req.file.r2Url) {
            newTemplatePayload.imgSrc = req.file.r2Url;
        } else if (!req.body.id) {
            return res.status(400).json({ message: 'Ảnh đại diện là bắt buộc khi tạo mẫu mới.' });
        }
        
        newTemplatePayload.description = await processContentImages(req.body.description);

        const newTemplate = await invitationTemplateService.createTemplate(newTemplatePayload);
        res.status(201).json({ status: 'success', data: newTemplate });
    } catch (error) {
        console.error("Error Body:", req.body);
        next(error);
    }
};

const updateTemplate = async (req, res, next) => {
    try {
        const parsedTemplateData = JSON.parse(req.body.templateData);

        // --- BẮT ĐẦU SỬA LỖI ---
        let parsedLoveGiftsButton = null;

        // Ưu tiên lấy setting chung từ DB
        const loveGiftButtonSetting = await Settings.findOne({ key: 'loveGiftButton' });
        if (loveGiftButtonSetting && loveGiftButtonSetting.value) {
            parsedLoveGiftsButton = {
                title: loveGiftButtonSetting.value.title,
                url: loveGiftButtonSetting.value.url
            };
        } else if (req.body.loveGiftsButton && typeof req.body.loveGiftsButton === 'string') {
            // Nếu không có setting chung, thì dùng logic parse của bạn
            try {
                parsedLoveGiftsButton = JSON.parse(req.body.loveGiftsButton);
            } catch (e) {
                console.error("Lỗi parse loveGiftsButton khi cập nhật:", e);
            }
        }
        // --- KẾT THÚC SỬA LỖI ---

        const updateData = {
            ...req.body,
            templateData: parsedTemplateData,
            loveGiftsButton: parsedLoveGiftsButton, // Gán giá trị đã xử lý
        };

        if (req.file && req.file.r2Url) {
            updateData.imgSrc = req.file.r2Url;
        }
        
        updateData.description = await processContentImages(req.body.description);

        if (req.body.displayOrder) {
            updateData.displayOrder = req.body.displayOrder;
        }

        const updatedTemplate = await invitationTemplateService.updateTemplateById(
            req.params.id,
            updateData
        );
        if (!updatedTemplate) {
            return res.status(404).json({ message: 'Không tìm thấy mẫu thiệp.' });
        }
        res.status(200).json({ status: 'success', data: updatedTemplate });
    } catch (error) {
        console.error("Error Body:", req.body);
        next(error);
    }
};

const deleteTemplate = async (req, res, next) => {
    try {
        await invitationTemplateService.deleteTemplateById(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

const seedTemplates = async (req, res, next) => {
    // ... (giữ nguyên hàm seed)
};

const getTemplateCategories = async (req, res, next) => {
    try {
        const categories = await invitationTemplateService.getUniqueCategories();
        res.status(200).json({
            status: 'success',
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

const getTemplateTypesForCategory = async (req, res, next) => {
    try {
        const { category, group } = req.query;
        let types = [];
        if (category && group) {
            types = await invitationTemplateService.getUniqueTypesForCategoryAndGroup(category, group);
        } else if (category) {
            types = await invitationTemplateService.getUniqueTypesForCategory(category);
        }
        
        res.status(200).json({
            status: 'success',
            data: types,
        });
    } catch (error) {
        next(error);
    }
};

const bulkCreateTemplates = async (req, res, next) => {
    try {
        const templatesToCreate = req.body.templates;
        if (!templatesToCreate || !Array.isArray(templatesToCreate)) {
            return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ.' });
        }

        const defaultTemplateData = { width: 800, height: 600, pages: [] };
        const defaultImgSrc = 'https://placehold.co/400x300/e0e0e0/777?text=Chưa+thiết+kế';

        const processedTemplates = templatesToCreate.map(t => ({
            ...t,
            imgSrc: t.imgSrc || defaultImgSrc,
            templateData: t.templateData || defaultTemplateData,
        }));

        const result = await invitationTemplateService.bulkCreateTemplates(processedTemplates);

        res.status(201).json({
            status: 'success',
            message: `Đã thêm thành công ${result.length} mẫu thiệp.`,
            data: result,
        });
    } catch (error) {
        if (error.code === 11000) {
             res.status(409).json({
                 message: `Thêm mới thất bại. Có ${error.writeErrors.length} lỗi, có thể do trùng tiêu đề mẫu.`,
                 errors: error.writeErrors.map(e => `Mẫu '${e.op.title}' bị lỗi: ${e.errmsg}`),
             });
        } else {
             next(error);
        }
    }
};

const incrementView = async (req, res, next) => {
  try {
    await invitationTemplateService.incrementTemplateView(req.params.id);
    res.status(200).json({ success: true, message: 'View counted.' });
  } catch (error) {
    console.error(`Could not count view for template ${req.params.id}:`, error);
    res.status(200).json({ success: false });
  }
};

const reorderTemplates = async (req, res, next) => {
    try {
        const { templateIds } = req.body;
        if (!Array.isArray(templateIds) || templateIds.length === 0) {
            return res.status(400).json({ message: 'Danh sách ID thiệp không hợp lệ' });
        }
        await invitationTemplateService.reorderTemplates(templateIds);
        res.status(200).json({ message: 'Cập nhật thứ tự thành công' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getInvitationTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    seedTemplates,
    getTemplateCategories,
    getTemplateTypesForCategory,
    bulkCreateTemplates,
    incrementView,
    getTemplateGroups,
    reorderTemplates
};
