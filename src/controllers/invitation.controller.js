const invitationService = require('../services/invitation.service');
const mongoose = require('mongoose');
const sharp = require('sharp');
const { uploadFileToCloudflare } = require('../services/cloudflare.service.js');
const _ = require('lodash');
const AppError = require('../utils/AppError');

// === HÀM TRỢ GIÚP MỚI ĐỂ XỬ LÝ FILE TẢI LÊN ===
const handleUploadedFiles = async (dataObject, files) => {
    if (!files || files.length === 0) return dataObject;

    const fileMap = new Map();
    const uploadPromises = files.map(async (file) => {
        const processedBuffer = await sharp(file.buffer)
            .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
        const { url } = await uploadFileToCloudflare(processedBuffer);
        fileMap.set(file.fieldname, url);
    });
    await Promise.all(uploadPromises);

    // Hàm đệ quy để thay thế placeholders trong object
    const replacePlaceholders = (obj) => {
        _.forOwn(obj, (value, key, parent) => {
            if (_.isObject(value)) {
                replacePlaceholders(value);
            } else if (typeof value === 'string' && value.startsWith('__FILE_PLACEHOLDER_')) {
                const fieldName = value.replace('__FILE_PLACEHOLDER_', '').replace(/__$/, '');
                if (fileMap.has(fieldName)) {
                    parent[key] = fileMap.get(fieldName);
                }
            }
        });
    };

    replacePlaceholders(dataObject);
    return dataObject;
};


// === CÁC CONTROLLERS ĐÃ ĐƯỢC CẬP NHẬT ===

const createInvitation = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { templateId, slug, design } = req.body;
        
        let contentData = JSON.parse(req.body.content || '[]');
        let settingsData = JSON.parse(req.body.settings || '{}');
        const files = req.files || [];

        if (files.length > 0) {
            await Promise.all(files.map(async (file) => {
                const processedBuffer = await sharp(file.buffer)
                    .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toBuffer();
                const { url } = await uploadFileToCloudflare(processedBuffer);
                
                if (file.fieldname.startsWith('background_')) {
                    const pageId = file.fieldname.split('_')[1];
                    const pageIndex = contentData.findIndex(p => p.id === pageId);
                    if (pageIndex !== -1) {
                        contentData[pageIndex].backgroundImage = url;
                    }
                } else {
                    const path = file.fieldname.replace(/__/g, '.');
                    _.set(settingsData, path, url);
                }
            }));
        }

        const newInvitation = await invitationService.createInvitationFromTemplate(
            userId, templateId, slug, contentData, design, settingsData
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
        if (error.message.includes('Không tìm thấy mẫu thiệp')) {
             return next(new AppError(error.message, 404));
        }
        next(error);
    }
};




const updateInvitation = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
        const updateData = req.body;

        const contentData = JSON.parse(updateData.content || '[]');
        let settingsUpdate = JSON.parse(updateData.settings || '{}');
        const designUpdate = JSON.parse(updateData.design || '{}');

        if (req.files && req.files.length > 0) {
            const uploadedImageUrls = {};

            const uploadPromises = req.files.map(async (file) => {
                const processedBuffer = await sharp(file.buffer)
                    .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toBuffer();
                
                const { url } = await uploadFileToCloudflare(processedBuffer);

                if (file.fieldname.startsWith('background_')) {
                    const pageId = file.fieldname.split('_')[1];
                    const pageIndex = contentData.findIndex(p => p.id === pageId);
                    if (pageIndex > -1) {
                        contentData[pageIndex].backgroundImage = url;
                    }
                }
                else {
                    if (file.fieldname.endsWith('[]')) {
                        const key = file.fieldname.slice(0, -2);
                        if (!uploadedImageUrls[key]) uploadedImageUrls[key] = [];
                        uploadedImageUrls[key].push(url);
                    } else {
                        const path = file.fieldname.replace(/_/g, '.');
                        _.set(uploadedImageUrls, path, url);
                    }
                }
            });

            await Promise.all(uploadPromises);

            settingsUpdate = _.mergeWith(settingsUpdate, uploadedImageUrls, (objValue, srcValue) => {
                if (_.isArray(objValue)) {
                    return objValue.concat(srcValue);
                }
            });
        }

        updateData.content = contentData;
        updateData.settings = settingsUpdate;
        updateData.design = designUpdate;

        const updatedInvitation = await invitationService.updateInvitation(invitationId, userId, updateData);

        if (!updatedInvitation) {
            return next(new AppError('Không tìm thấy thiệp hoặc bạn không có quyền.', 404));
        }

        res.status(200).json({
            status: 'success',
            message: 'Thiệp mời đã được cập nhật thành công!',
            data: updatedInvitation
        });
    } catch (error) {
        if (error.code === 11000) {
            return next(new AppError('Slug này đã được sử dụng.', 409));
        }
        next(error);
    }
};



const updateInvitationSettings = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;

        if (!req.body.settingsData) {
            return next(new AppError('Thiếu dữ liệu cài đặt (settingsData).', 400));
        }
        let settingsUpdate = JSON.parse(req.body.settingsData);
        
        if (req.files && req.files.length > 0) {
             await Promise.all(req.files.map(async (file) => {
                const processedBuffer = await sharp(file.buffer)
                    .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toBuffer();
                const { url } = await uploadFileToCloudflare(processedBuffer);
                const path = file.fieldname.replace(/__/g, '.');
                 if (file.fieldname.endsWith('[]')) {
                    const arrayPath = path.slice(0, -2);
                    if (!_.has(settingsUpdate, arrayPath)) {
                        _.set(settingsUpdate, arrayPath, []);
                    }
                    _.get(settingsUpdate, arrayPath).push(url);
                } else {
                    _.set(settingsUpdate, path, url);
                }
            }));
        }
        
        const updatedInvitation = await invitationService.updateInvitationSettings(invitationId, userId, settingsUpdate);

        if (!updatedInvitation) {
             return next(new AppError('Không tìm thấy thiệp hoặc bạn không có quyền.', 404));
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


// ... (Các hàm khác giữ nguyên: getMyInvitations, getInvitation, deleteInvitation, addGuest, etc.)
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

const getInvitation = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
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

const deleteInvitation = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
        const success = await invitationService.deleteInvitation(invitationId, userId);
        if (!success) {
            return next(new AppError('Không tìm thấy thiệp hoặc bạn không có quyền.', 404));
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

const addGuest = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
        const guestData = req.body;
        const invitation = await invitationService.getInvitationByIdAndUser(invitationId, userId);
        if (!invitation) {
            return next(new AppError('Không tìm thấy thiệp hoặc bạn không có quyền.', 404));
        }
        if (guestData.email) {
            const emailExists = invitation.guests.some(
                guest => guest.email && guest.email.toLowerCase() === guestData.email.toLowerCase()
            );
            if (emailExists) {
                return next(new AppError('Email này đã tồn tại trong danh sách khách mời của bạn.', 409));
            }
        }
        const updatedInvitation = await invitationService.addGuestToInvitation(invitationId, userId, guestData);
        res.status(201).json({
            status: 'success',
            message: 'Khách mời đã được thêm thành công!',
            data: updatedInvitation.guests[updatedInvitation.guests.length - 1]
        });
    } catch (error) {
        next(error);
    }
};

const updateGuest = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id: invitationId, guestId } = req.params;
        const guestUpdateData = req.body;
        const updatedInvitation = await invitationService.updateGuestInInvitation(invitationId, guestId, userId, guestUpdateData);
        if (!updatedInvitation) {
            return next(new AppError('Không tìm thấy thiệp hoặc khách mời.', 404));
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

const removeGuest = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id: invitationId, guestId } = req.params;
        const updatedInvitation = await invitationService.removeGuestFromInvitation(invitationId, guestId, userId);
        if (!updatedInvitation) {
             return next(new AppError('Không tìm thấy thiệp hoặc khách mời.', 404));
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

const getPublicInvitationBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { guestId } = req.query;
        const invitation = await invitationService.getInvitationBySlug(slug, guestId);
        if (!invitation) {
            return next(new AppError('Không tìm thấy thiệp mời.', 404));
        }
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
        const invitation = await invitationService.getPublicInvitationById(id, guestId);
        if (!invitation) {
            return next(new AppError('Không tìm thấy thiệp mời.', 404));
        }
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

const addWish = async (req, res, next) => {
    try {
        const invitationId = req.params.id;
        const wishData = req.body;
        const invitation = await invitationService.addWishToInvitation(invitationId, wishData);
        res.status(201).json({
            status: 'success',
            message: 'Lời chúc đã được thêm thành công!',
            data: invitation.wishes[invitation.wishes.length - 1]
        });
    } catch (error) {
        next(error);
    }
};

const getGuestGroups = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
        const groups = await invitationService.getGuestGroupsByInvitationId(invitationId, userId);
        res.status(200).json({
            status: 'success',
            results: groups.length,
            data: groups,
        });
    } catch (error) {
        next(error);
    }
};

const addGuestGroup = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
        const { name, salutation } = req.body;
        const updatedInvitation = await invitationService.addGuestGroupToInvitation(invitationId, userId, { name, salutation });
        res.status(201).json({
            status: 'success',
            message: 'Nhóm khách mời đã được thêm thành công!',
            data: updatedInvitation.guestGroups[updatedInvitation.guestGroups.length - 1],
        });
    } catch (error) {
        next(error);
    }
};

const updateGuestGroup = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
        const groupId = req.params.groupId;
        const { name, salutation } = req.body;
        const updatedInvitation = await invitationService.updateGuestGroupInInvitation(invitationId, groupId, userId, { name, salutation });
        if (!updatedInvitation) {
            return next(new AppError('Không tìm thấy thiệp hoặc nhóm khách mời.', 404));
        }
        res.status(200).json({
            status: 'success',
            message: 'Nhóm khách mời đã được cập nhật thành công!',
            data: updatedInvitation.guestGroups.id(groupId),
        });
    } catch (error) {
        next(error);
    }
};

const removeGuestGroup = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const invitationId = req.params.id;
        const groupId = req.params.groupId;
        const updatedInvitation = await invitationService.removeGuestGroupFromInvitation(invitationId, groupId, userId);
        if (!updatedInvitation) {
            return next(new AppError('Không tìm thấy thiệp hoặc nhóm khách mời.', 404));
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

const sendInvitationEmailToGuest = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id: invitationId, guestId } = req.params;
        const updatedGuest = await invitationService.sendInvitationEmailToGuest(invitationId, guestId, userId);
        res.status(200).json({
            status: 'success',
            message: 'Email đã được gửi thành công.',
            data: updatedGuest,
        });
    } catch (error) {
        next(error);
    }
};

const submitRsvp = async (req, res, next) => {
    try {
        const { invitationId, guestId } = req.params;
        const { status, attendingCount } = req.body;
        if (!status || !['pending', 'attending', 'declined'].includes(status)) {
            return next(new AppError('Trạng thái RSVP không hợp lệ.', 400));
        }
        if (status === 'attending' && (typeof attendingCount !== 'number' || attendingCount < 1)) {
            return next(new AppError('Số lượng người tham dự phải là số dương khi trạng thái là "attending".', 400));
        }
        const updatedGuest = await invitationService.updateGuestRsvp(invitationId, guestId, { status, attendingCount });
        if (!updatedGuest) {
            return next(new AppError('Không tìm thấy thiệp hoặc khách mời.', 404));
        }
        res.status(200).json({
            success: true,
            message: 'Phản hồi RSVP đã được cập nhật thành công.',
            data: updatedGuest,
        });
    } catch (error) {
        next(error);
    }
};

const updateInvitationBackground = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new AppError('Vui lòng tải lên một file ảnh.', 400));
        }
        const { id } = req.params;
        const file = req.file;

        const processedBuffer = await sharp(file.buffer)
            .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
        
        const { url } = await uploadFileToCloudflare(processedBuffer);

        const updatedInvitation = await invitationService.updateInvitationById(id, {
            background: url,
        });
        if (!updatedInvitation) {
            return next(new AppError('Không tìm thấy thiệp mời.', 404));
        }
        res.status(200).json({
            status: 'success',
            data: {
                invitation: updatedInvitation,
            },
        });
    } catch (error) {
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
    updateInvitationSettings,
    getGuestGroups,
    addGuestGroup,
    updateGuestGroup,
    removeGuestGroup,
    sendInvitationEmailToGuest,
    getPublicInvitationById,
    submitRsvp,
    updateInvitationBackground,
};