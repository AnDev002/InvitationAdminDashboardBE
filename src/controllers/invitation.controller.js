const invitationService = require('../services/invitation.service');
const mongoose = require('mongoose'); // Thêm dòng này để kiểm tra ObjectId
const sharp = require('sharp');
const { uploadFileToR2 } = require('../services/r2.service.js'); // Đảm bảo bạn đã export hàm này
const _ = require('lodash'); // Thư viện tiện ích giúp set giá trị cho object lồng nhau
const AppError = require('../utils/AppError');

// === Controllers cho các hành động cần xác thực ===

// Tạo thiệp mới
const createInvitation = async (req, res, next) => {
    try {
        const contentData = JSON.parse(req.body.content || '[]');

        if (req.files && req.files.length > 0) {
            const fileMap = new Map(req.files.map(f => [f.fieldname, f]));

            for (const page of contentData) {
                const bgFile = fileMap.get(`background_${page.id}`);
                if (bgFile && page.backgroundImage.startsWith('__FILE_PLACEHOLDER_BG_')) {
                    const processedBuffer = await sharp(bgFile.buffer).webp({ quality: 85 }).toBuffer();
                    const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
                    page.backgroundImage = url;
                }
            }
        }

        const userId = req.user._id;
        const { templateId, slug, design, settings } = req.body;
        const newInvitation = await invitationService.createInvitationFromTemplate(
            userId, templateId, slug, contentData, design, settings
        );

        res.status(201).json({
            status: 'success',
            message: 'Thiệp mời đã được tạo thành công!',
            data: newInvitation
        });
    } catch (error) {
        if (error.code === 11000) {
            return next(new AppError('Slug này đã được sử dụng. Vui lòng chọn một slug khác.', 409));
        }
        if (error.message.includes('Không tìm thấy mẫu thiệp')) { // From service
             return next(new AppError(error.message, 404));
        }
        next(error);
    }
};

// Lấy tất cả thiệp của người dùng đang đăng nhập
const getMyInvitations = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitations = await invitationService.getInvitationsByUserId(userId);
        res.status(200).json({
            status: 'success',
            results: invitations.length,
            data: invitations
        });
    } catch (error) {
        next(error);
    }
};

// Lấy chi tiết một thiệp (yêu cầu quyền sở hữu)
const getInvitation = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;

        // Validation by param('id').isMongoId() in route

        const invitation = await invitationService.getInvitationByIdAndUser(invitationId, userId);
        if (!invitation) {
            return next(new AppError('Không tìm thấy thiệp hoặc bạn không có quyền truy cập.', 404));
        }
        res.status(200).json({
            status: 'success',
            data: invitation
        });
    } catch (error) {
        next(error);
    }
};


// Cập nhật thiệp
const updateInvitation = async (req, res, next) => {
    try {
        const updateData = req.body;
        const contentData = JSON.parse(updateData.content || '[]');

        if (req.files && req.files.length > 0) {
            const fileMap = new Map(req.files.map(f => [f.fieldname, f]));

            for (const page of contentData) {
                const bgFile = fileMap.get(`background_${page.id}`);
                if (bgFile && page.backgroundImage.startsWith('__FILE_PLACEHOLDER_BG_')) {
                    const processedBuffer = await sharp(bgFile.buffer).webp({ quality: 85 }).toBuffer();
                    const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
                    page.backgroundImage = url;
                }
            }
        }
        updateData.content = contentData;
        const userId = req.user._id;
        const invitationId = req.params.id;

        // Validation by param('id').isMongoId() and validateInvitation middleware

        const updatedInvitation = await invitationService.updateInvitation(invitationId, userId, updateData);
        if (!updatedInvitation) {
            return res.status(404).json({ message: 'Không tìm thấy thiệp hoặc bạn không có quyền.' });
        }
        res.status(200).json({
            status: 'success',
            message: 'Thiệp mời đã được cập nhật thành công!',
            data: updatedInvitation
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Slug này đã được sử dụng.' });
        }
        next(error);
    }
};


// Xóa thiệp
const deleteInvitation = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;

        // Validation by param('id').isMongoId() in route

        const success = await invitationService.deleteInvitation(invitationId, userId);
        if (!success) {
            return res.status(404).json({ message: 'Không tìm thấy thiệp hoặc bạn không có quyền.' });
        }
        res.status(204).send(); // No content for successful deletion
    } catch (error) {
        next(error);
    }
};


// Thêm khách mời
const addGuest = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
        const guestData = req.body;

        // Lấy thông tin thiệp mời trước
        const invitation = await invitationService.getInvitationByIdAndUser(invitationId, userId);

        if (!invitation) {
            return res.status(404).json({ message: 'Không tìm thấy thiệp hoặc bạn không có quyền.' });
        }

        if (guestData.email) {
            const emailExists = invitation.guests.some(
                guest => guest.email && guest.email.toLowerCase() === guestData.email.toLowerCase()
            );
            if (emailExists) {
                return res.status(409).json({ message: 'Email này đã tồn tại trong danh sách khách mời của bạn.' });
            }
        }

        // Gọi service để thêm khách mời (service sẽ lưu vào DB)
        const updatedInvitation = await invitationService.addGuestToInvitation(invitationId, userId, guestData);
        
        // Trả về khách mời vừa thêm
        res.status(201).json({
            status: 'success',
            message: 'Khách mời đã được thêm thành công!',
            data: updatedInvitation.guests[updatedInvitation.guests.length - 1]
        });
    } catch (error) {
        next(error);
    }
};



// Cập nhật khách mời
const updateGuest = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id: invitationId, guestId } = req.params;
        const guestUpdateData = req.body;

        // Validation by params and validateGuest middleware

        const updatedInvitation = await invitationService.updateGuestInInvitation(invitationId, guestId, userId, guestUpdateData);
        if (!updatedInvitation) {
            return res.status(404).json({ message: 'Không tìm thấy thiệp hoặc khách mời.' });
        }
        res.status(200).json({
            status: 'success',
            message: 'Khách mời đã được cập nhật thành công!',
            data: updatedInvitation.guests.id(guestId)
        });
    } catch (error) {
        next(error);
    }
};


// Xóa khách mời
const removeGuest = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id: invitationId, guestId } = req.params;

        // Validation by params in route

        const updatedInvitation = await invitationService.removeGuestFromInvitation(invitationId, guestId, userId);
        // service throws error if not found, so we just check for null return if service logic changes
        if (!updatedInvitation) { // This case is actually covered by service throwing error
            return res.status(404).json({ message: 'Không tìm thấy thiệp hoặc khách mời.' });
        }
        res.status(204).send();
    } catch (error) {
        // Service already throws specific errors, so just pass to next
        next(error);
    }
};



// === Controllers cho các hành động công khai ===

// Lấy thiệp công khai bằng slug
const getPublicInvitationBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { guestId } = req.query;

        // Basic validation for slug is in route, guestId will be validated in service
        
        const invitation = await invitationService.getInvitationBySlug(slug, guestId);
        
        if (!invitation) {
            return res.status(404).json({ message: 'Không tìm thấy thiệp mời.' });
        }
        
        // If password is set, we return minimal info, and frontend handles password check
        if (invitation.settings && invitation.settings.password) {
            return res.status(200).json({
                status: 'success',
                message: 'Thiệp mời yêu cầu mật khẩu.',
                data: { requiresPassword: true, _id: invitation._id, slug: invitation.slug, template: invitation.template }
            });
        }

        res.status(200).json({
            status: 'success',
            data: invitation
        });
    } catch (error) {
        next(error);
    }
};


const getPublicInvitationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { guestId } = req.query;

        // Validation by param('id').isMongoId() in route
        
        const invitation = await invitationService.getPublicInvitationById(id, guestId);
        
        if (!invitation) {
            return res.status(404).json({ message: 'Không tìm thấy thiệp mời.' });
        }

        // Handle password protected invitations
        if (invitation.settings && invitation.settings.password) {
            return res.status(200).json({
                status: 'success',
                message: 'Thiệp mời yêu cầu mật khẩu.',
                data: { requiresPassword: true, _id: invitation._id, slug: invitation.slug, template: invitation.template } // Only send essential info
            });
        }
        
        res.status(200).json({
            status: 'success',
            data: invitation
        });
    } catch (error) {
        if (error.message.includes('ID thiệp mời không hợp lệ')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};


// Thêm lời chúc
const addWish = async (req, res, next) => {
    try {
        const invitationId = req.params.id;
        const wishData = req.body;

        // Validation by param('id').isMongoId() and validateWish middleware

        const invitation = await invitationService.addWishToInvitation(invitationId, wishData);
        // Service already checks showWishList and throws error
        res.status(201).json({
            status: 'success',
            message: 'Lời chúc đã được thêm thành công!',
            data: invitation.wishes[invitation.wishes.length - 1] // Return the newly added wish
        });
    } catch (error) {
        // Catch specific errors thrown by the service
        if (error.message.includes('Không tìm thấy thiệp') || error.message.includes('Chủ nhân thiệp không cho phép')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};


// MỚI: Controller để cập nhật cài đặt thiệp
const updateInvitationSettings = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;

        if (!req.body.settingsData) {
            return res.status(400).json({ message: 'Thiếu dữ liệu cài đặt (settingsData).' });
        }
        let settingsUpdate = req.body.settingsData;
        
        // Mảng để chứa các URL của bộ sưu tập ảnh mới
        const newGalleryImageUrls = [];
        const singleImageUpdates = {}; // For groom/bride/hero images

        // Xử lý các file ảnh được tải lên (nếu có)
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                const processedBuffer = await sharp(file.buffer)
                    .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toBuffer();
                
                const { url } = await uploadFileToR2(processedBuffer, 'image/webp');

                if (file.fieldname === 'galleryImages') {
                    newGalleryImageUrls.push(url);
                } else {
                    // Use lodash.set to handle nested paths like 'heroImages.main'
                    _.set(singleImageUpdates, file.fieldname.replace(/_/g, '.'), url);
                }
            });
            await Promise.all(uploadPromises);
        }

        // Merge single image updates into settingsUpdate
        settingsUpdate = _.merge(settingsUpdate, singleImageUpdates);

        // Hợp nhất các URL mới của bộ sưu tập với các URL cũ đã có
        if (newGalleryImageUrls.length > 0) {
            // Đảm bảo trường galleryImages là một mảng trước khi hợp nhất
            if (!Array.isArray(settingsUpdate.galleryImages)) {
                settingsUpdate.galleryImages = [];
            }
            settingsUpdate.galleryImages.push(...newGalleryImageUrls);
        }
        
        // Gọi service để cập nhật vào DB với object settings hoàn chỉnh
        const updatedInvitation = await invitationService.updateInvitationSettings(invitationId, userId, settingsUpdate);

        if (!updatedInvitation) {
            return res.status(404).json({ message: 'Không tìm thấy thiệp hoặc bạn không có quyền.' });
        }

        res.status(200).json({
            success: true,
            message: 'Cài đặt thiệp đã được cập nhật thành công.',
            data: updatedInvitation.settings,
        });
    } catch (error) {
        console.error("Error in updateInvitationSettings:", error);
        next(error);
    }
};





// --- MỚI: Controllers cho Quản lý Nhóm khách mời ---

const getGuestGroups = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
        
        // Validation by param('id').isMongoId() in route

        const groups = await invitationService.getGuestGroupsByInvitationId(invitationId, userId);
        res.status(200).json({
            status: 'success',
            results: groups.length,
            data: groups,
        });
    } catch (error) {
        if (error.message.includes('Không tìm thấy thiệp')) {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};


const addGuestGroup = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
        const { name, salutation } = req.body;

        // Validation by param('id').isMongoId() and validateGuestGroup middleware
        
        const updatedInvitation = await invitationService.addGuestGroupToInvitation(invitationId, userId, { name, salutation });
        res.status(201).json({
            status: 'success',
            message: 'Nhóm khách mời đã được thêm thành công!',
            data: updatedInvitation.guestGroups[updatedInvitation.guestGroups.length - 1], // Trả về nhóm vừa thêm
        });
    } catch (error) {
        if (error.message.includes('Không tìm thấy thiệp')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('Tên nhóm đã tồn tại')) {
            return res.status(409).json({ message: error.message });
        }
        next(error);
    }
};


const updateGuestGroup = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
        const groupId = req.params.groupId;
        const { name, salutation } = req.body;

        // Validation by params and validateGuestGroup middleware

        const updatedInvitation = await invitationService.updateGuestGroupInInvitation(invitationId, groupId, userId, { name, salutation });

        if (!updatedInvitation) {
            return res.status(404).json({ message: 'Không tìm thấy thiệp hoặc nhóm khách mời.' });
        }

        res.status(200).json({
            status: 'success',
            message: 'Nhóm khách mời đã được cập nhật thành công!',
            data: updatedInvitation.guestGroups.id(groupId), // Trả về nhóm đã cập nhật
        });
    } catch (error) {
        if (error.message.includes('Không tìm thấy thiệp') || error.message.includes('Không tìm thấy nhóm')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('Tên nhóm đã tồn tại')) {
            return res.status(409).json({ message: error.message });
        }
        next(error);
    }
};


const removeGuestGroup = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
        const groupId = req.params.groupId;

        // Validation by params in route

        const updatedInvitation = await invitationService.removeGuestGroupFromInvitation(invitationId, groupId, userId);

        if (!updatedInvitation) {
            return res.status(404).json({ message: 'Không tìm thấy thiệp hoặc nhóm khách mời.' });
        }

        res.status(204).send();
    } catch (error) {
        if (error.message.includes('Không tìm thấy thiệp') || error.message.includes('Không tìm thấy nhóm')) {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};


const sendInvitationEmailToGuest = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id: invitationId, guestId } = req.params;

        // Validation by params in route

        const updatedGuest = await invitationService.sendInvitationEmailToGuest(invitationId, guestId, userId);
        
        res.status(200).json({
            status: 'success',
            message: 'Email đã được gửi thành công.',
            data: updatedGuest,
        });
    } catch (error) {
        if (error.message.includes('Không tìm thấy thiệp') || error.message.includes('Không tìm thấy khách mời')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('Khách mời không có địa chỉ email')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes('Gửi email thất bại')) { // Catch specific error from service
            return res.status(500).json({ message: error.message });
        }
        next(error);
    }
};


// <<< THÊM MỚI: CONTROLLER ĐỂ XỬ LÝ RSVP >>>
const submitRsvp = async (req, res, next) => {
    try {
        const { invitationId, guestId } = req.params;
        const { status, attendingCount } = req.body;

        // Validate RSVP data (status, attendingCount)
        if (!status || !['pending', 'attending', 'declined'].includes(status)) {
            return res.status(400).json({ message: 'Trạng thái RSVP không hợp lệ.' });
        }
        if (status === 'attending' && (typeof attendingCount !== 'number' || attendingCount < 1)) {
            return res.status(400).json({ message: 'Số lượng người tham dự phải là số dương khi trạng thái là "attending".' });
        }

        const updatedGuest = await invitationService.updateGuestRsvp(invitationId, guestId, { status, attendingCount });

        if (!updatedGuest) {
            return res.status(404).json({ message: 'Không tìm thấy thiệp hoặc khách mời.' });
        }
        
        res.status(200).json({
            success: true,
            message: 'Phản hồi RSVP đã được cập nhật thành công.',
            data: updatedGuest,
        });
    } catch (error) {
        if (error.message.includes('Không tìm thấy thiệp') || error.message.includes('Không tìm thấy thông tin khách mời')) {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};


module.exports = {
    createInvitation,
    getMyInvitations,
    getInvitation,
    updateInvitation,
    deleteInvitation,
    addGuest,
    updateGuest,
    removeGuest,
    getPublicInvitationBySlug,
    addWish,
    updateInvitationSettings, // NEW
    getGuestGroups, // NEW
    addGuestGroup, // NEW
    updateGuestGroup, // NEW
    removeGuestGroup, // NEW
    sendInvitationEmailToGuest,
    getPublicInvitationById,
    submitRsvp,
};
