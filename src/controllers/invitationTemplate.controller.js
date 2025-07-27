const mongoose = require('mongoose'); // <--- THÊM DÒNG NÀY
const InvitationTemplate = require('../models/invitationTemplate.model');
const invitationTemplateService = require('../services/invitationTemplate.service');
const APIFeatures = require('../utils/apiFeature');
const getInvitationTemplates = async (req, res, next) => {
    try {

        const { search } = req.query;
        let initialQuery = {};

        if (search) {
            initialQuery = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } },
                    { tags: { $regex: search, $options: 'i' } }
                ]
            };
        }


        // Gọi service và truyền initialQuery vào
        const features = new APIFeatures(invitationTemplateService.queryInvitationTemplates(initialQuery), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate();


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


const seedTemplates = async (req, res, next) => {
    const allInvitations = [
        { category: 'Thiệp Mời', type: 'invitations', title: 'Thiệp Mời Floral Vintage', imgSrc: 'https://images.unsplash.com/photo-1552881244-a4f6d4a56a42?q=80&w=800' },
        { category: 'Thiệp Chúc Mừng', type: 'greeting-cards', title: 'Thiệp Sinh Nhật Rực Rỡ', imgSrc: 'https://images.unsplash.com/photo-1589418823849-5f11ff4c3b11?q=80&w=800' },
        { category: 'Thiệp Cảm Ơn', type: 'thank-you-cards', title: 'Thiệp Cảm Ơn Tối Giản', imgSrc: 'https://images.unsplash.com/photo-1562963053-4886b6209014?q=80&w=800' },
        { category: 'Thiệp Khác', type: 'other', title: 'Thiệp Tân Gia Hiện Đại', imgSrc: 'https://images.unsplash.com/photo-1600061524354-937b22144d13?q=80&w=800' },
        { category: 'Thiệp Mời', type: 'invitations', title: 'Thiệp Cưới Sang Trọng', imgSrc: 'https://images.unsplash.com/photo-1616139943484-9a3ba2c589b8?q=80&w=800' },
        { category: 'Thiệp Chúc Mừng', type: 'greeting-cards', title: 'Thiệp Chúc Mừng Năm Mới', imgSrc: 'https://images.unsplash.com/photo-1574856342045-1b3d7f694e84?q=80&w=800' },
        { category: 'Thiệp Cảm Ơn', type: 'thank-you-cards', title: 'Thiệp Tri Ân Đối Tác', imgSrc: 'https://images.unsplash.com/photo-1592328228393-201b9a28b14c?q=80&w=800' },
        { category: 'Thiệp Khác', type: 'other', title: 'Thiệp Tốt Nghiệp', imgSrc: 'https://images.unsplash.com/photo-1598024488390-9519b514b8a4?q=80&w=800' },
    ];
    try {
        await InvitationTemplate.deleteMany({});
        await InvitationTemplate.insertMany(allInvitations);
        res.status(200).json({ message: 'Database seeded successfully!' });
    } catch (error) {
        next(error);
    }
};

const getTemplateById = async (req, res, next) => {
    try {
        // Kiểm tra xem ID có phải là một ObjectId hợp lệ không
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID mẫu thiệp không hợp lệ.' });
        }

        const template = await InvitationTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Không tìm thấy mẫu thiệp.' });
        }
        res.status(200).json({
            status: 'success',
            data: template,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getInvitationTemplates, getTemplateById, seedTemplates };