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

module.exports = {
    getInvitationTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    seedTemplates
};