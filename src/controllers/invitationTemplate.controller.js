const mongoose = require('mongoose');
const InvitationTemplate = require('../models/invitationTemplate.model');
const invitationTemplateService = require('../services/invitationTemplate.service');
const APIFeatures = require('../utils/apiFeature');

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
        if (!category) {
            return res.status(400).json({ message: 'Cần có Category.' });
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

// HÀM MỚI
const createTemplate = async (req, res, next) => {
    try {
        // Dữ liệu từ FormData sẽ là dạng chuỗi, cần parse lại
        const parsedTemplateData = JSON.parse(req.body.templateData);

        const newTemplatePayload = {
            ...req.body, // Lấy title, category, type, description...
            templateData: parsedTemplateData, // Gán lại templateData đã được parse
        };

        // Gán đường dẫn ảnh từ middleware sau khi upload thành công
        if (req.file && req.file.r2Url) {
            newTemplatePayload.imgSrc = req.file.r2Url;
        } else if (!req.body.id) { // Chỉ yêu cầu ảnh khi tạo mới
            // Nếu không có file và đang tạo mới, trả về lỗi 400
            return res.status(400).json({ message: 'Ảnh đại diện là bắt buộc khi tạo mẫu mới.' });
        }

        const newTemplate = await invitationTemplateService.createTemplate(newTemplatePayload);
        res.status(201).json({ status: 'success', data: newTemplate });
    } catch (error) {
        console.error("Error Body:", req.body); // Log lại để kiểm tra lỗi
        next(error);
    }
};

const updateTemplate = async (req, res, next) => {
    try {
        const parsedTemplateData = JSON.parse(req.body.templateData);

        const updateData = {
            ...req.body,
            templateData: parsedTemplateData,
        };

        if (req.file && req.file.r2Url) {
            updateData.imgSrc = req.file.r2Url;
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

// HÀM MỚI
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

// ++ BẮT ĐẦU THÊM MỚI ++
const getTemplateTypesForCategory = async (req, res, next) => {
    try {
        const { category, group } = req.query;
        if (!category || !group) {
            return res.status(400).json({ message: 'Cần có Category và Group.' });
        }
        const types = await invitationTemplateService.getUniqueTypesForCategoryAndGroup(category, group);
        res.status(200).json({
            status: 'success',
            data: types,
        });
    } catch (error) {
        next(error);
    }
};

// ++ KẾT THÚC THÊM MỚI ++

const bulkCreateTemplates = async (req, res, next) => {
    try {
        const templatesToCreate = req.body.templates; // Nhận mảng templates từ frontend
        if (!templatesToCreate || !Array.isArray(templatesToCreate)) {
            return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ.' });
        }

        // Gán dữ liệu mặc định cho các mẫu thiệp
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
        // Xử lý lỗi trùng lặp key (ví dụ: title)
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

// ++ HÀM MỚI ++
const incrementView = async (req, res, next) => {
  try {
    await invitationTemplateService.incrementTemplateView(req.params.id);
    res.status(200).json({ success: true, message: 'View counted.' });
  } catch (error) {
    // Không cần gửi lỗi về client vì đây là hành động nền
    console.error(`Could not count view for template ${req.params.id}:`, error);
    res.status(200).json({ success: false }); // Vẫn trả về 200
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
    getTemplateTypesForCategory, // ++ THÊM MỚI ++
    bulkCreateTemplates,
    incrementView,
    getTemplateGroups,
};