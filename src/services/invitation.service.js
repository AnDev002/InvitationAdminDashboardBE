const Invitation = require('../models/invitation.model');
const InvitationTemplate = require('../models/invitationTemplate.model'); // Import model template
const nodemailer = require('nodemailer'); // Uncomment if using Nodemailer
const mongoose = require('mongoose');
/**
 * [MỚI]
 * Lấy một thiệp mời công khai bằng slug của nó.
 * Hàm này không yêu cầu xác thực người dùng.
 * @param {string} slug - Slug của thiệp mời.
 * @returns {Promise<Document|null>} Thiệp mời nếu tìm thấy.
 */
const getInvitationBySlug = async (slug, guestId = null) => { // Thêm guestId làm tham số
    const invitation = await Invitation.findOne({ slug: slug }).populate('template', 'title');
    
    if (!invitation) {
        return null; // Trả về null nếu không tìm thấy thiệp
    }

    // Nếu có mật khẩu, logic kiểm tra sẽ ở controller/frontend
    if (invitation.settings.password) {
        // ...
    }

    // Nếu có guestId, tìm khách mời cụ thể và trả về
    if (guestId && mongoose.Types.ObjectId.isValid(guestId)) {
        const guest = invitation.guests.id(guestId);
        if (guest) {
            // Tạo một object mới để không thay đổi bản gốc và chỉ trả về những gì cần thiết
            const publicInvitation = invitation.toObject();
            publicInvitation.guestDetails = guest.toObject();
            return publicInvitation;
        }
    }

    return invitation; // Trả về thiệp gốc nếu không có guestId hoặc không tìm thấy guest
};



/**
 * Tạo một thiệp mời mới từ template.
 * @param {string} userId - ID người dùng.
 * @param {string} templateId - ID của mẫu thiệp được chọn.
 * @param {string} slug - Slug duy nhất cho URL.
 * @param {object} content - Dữ liệu nội dung thiệp từ người dùng.
 * @param {object} design - Tùy chỉnh thiết kế từ người dùng.
 * @param {object} settings - Các cài đặt cho thiệp.
 * @returns {Promise<Document>} Thiệp mời vừa được tạo.
 */
const createInvitationFromTemplate = async (userId, templateId, slug, content, design, settings) => {
    const template = await InvitationTemplate.findById(templateId);
    if (!template) {
        throw new Error('Không tìm thấy mẫu thiệp.');
    }

    const finalDesign = {
        ...(template.templateData?.design || {}),
        ...(design || {}),
    };

    const newInvitation = new Invitation({
        user: userId,
        template: templateId,
        slug: slug,
        content: content, // content (là pages array) được truyền trực tiếp
        design: finalDesign,
        settings: settings || { showWishList: true, showGuestList: false },
    });

    return await newInvitation.save();
};

/**
 * Cập nhật một thiệp mời.
 * @param {string} invitationId - ID của thiệp mời.
 * @param {string} userId - ID của người dùng.
 * @param {object} updateData - Dữ liệu cần cập nhật.
 * @returns {Promise<Document|null>} Thiệp mời đã được cập nhật.
 */
const updateInvitation = async (invitationId, userId, updateData) => {
    const allowedUpdates = {};
    if (updateData.slug) allowedUpdates.slug = updateData.slug;
    if (updateData.content) allowedUpdates.content = updateData.content;
    if (updateData.design) allowedUpdates.design = updateData.design;
    if (updateData.settings) {
        allowedUpdates.settings = updateData.settings;
    }
    const updatedInvitation = await Invitation.findOneAndUpdate(
        { _id: invitationId, user: userId }, 
        { $set: allowedUpdates },            
        { new: true, runValidators: true }  
    );
    return updatedInvitation;
};


const getInvitationsByUserId = async (userId) => {
    return await Invitation.find({ user: userId }).populate('template', 'title imgSrc');
};

const getInvitationByIdAndUser = async (invitationId, userId) => {
    return await Invitation.findOne({ _id: invitationId, user: userId }).populate('template');
};

const deleteInvitation = async (invitationId, userId) => {
    const result = await Invitation.deleteOne({ _id: invitationId, user: userId });
    return result.deletedCount > 0;
};

// --- Quản lý Khách mời ---

const addGuestToInvitation = async (invitationId, userId, guestData) => {
    const invitation = await Invitation.findOne({ _id: invitationId, user: userId });
    if (!invitation) {
        return null; // Hoặc throw error
    }
    invitation.guests.push(guestData);
    return await invitation.save();
};

/**
 * [MỚI]
 * Cập nhật thông tin một khách mời trong thiệp.
 * @param {string} invitationId - ID của thiệp.
 * @param {string} guestId - ID của khách mời cần cập nhật.
 * @param {string} userId - ID của chủ thiệp.
 * @param {object} guestUpdateData - Dữ liệu mới của khách mời.
 * @returns {Promise<Document|null>} Thiệp mời đã được cập nhật.
 */
const updateGuestInInvitation = async (invitationId, guestId, userId, guestUpdateData) => {
    const invitation = await Invitation.findOne({ _id: invitationId, user: userId });
    if (!invitation) {
        return null;
    }
    const guest = invitation.guests.id(guestId);
    if (!guest) {
        return null;
    }
    guest.set(guestUpdateData);
    return await invitation.save();
};

/**
 * [MỚI]
 * Xóa một khách mời khỏi thiệp.
 * @param {string} invitationId - ID của thiệp.
 * @param {string} guestId - ID của khách mời cần xóa.
 * @param {string} userId - ID của chủ thiệp.
 * @returns {Promise<Document|null>} Thiệp mời đã được cập nhật.
 */
const removeGuestFromInvitation = async (invitationId, guestId, userId) => {
    const invitation = await Invitation.findOne({ _id: invitationId, user: userId });
    if (!invitation) {
        throw new Error('Không tìm thấy thiệp hoặc bạn không có quyền.');
    }

    // Find the index of the guest to remove
    const guestIndex = invitation.guests.findIndex(g => g._id.toString() === guestId);
    if (guestIndex === -1) {
        throw new Error('Không tìm thấy khách mời.'); // Guest not found
    }

    // Remove the guest using splice
    invitation.guests.splice(guestIndex, 1);
    
    return await invitation.save();
};

// --- Quản lý Lời chúc ---

/**
 * [MỚI]
 * Thêm một lời chúc vào thiệp (công khai).
 * @param {string} invitationId - ID của thiệp.
 * @param {object} wishData - Dữ liệu lời chúc (author, message).
 * @returns {Promise<Document|null>} Thiệp mời đã được cập nhật.
 */
const addWishToInvitation = async (invitationId, wishData) => {
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
        throw new Error('Không tìm thấy thiệp.');
    }
    if (!invitation.settings.showWishList) {
        throw new Error('Chủ nhân thiệp không cho phép gửi lời chúc.');
    }
    invitation.wishes.push(wishData);
    return await invitation.save();
};

// MỚI: Function để cập nhật cài đặt thiệp
const updateInvitationSettings = async (invitationId, userId, settingsData) => {
    // Tạo một đối tượng payload để cập nhật toàn bộ trường 'settings'
    const updatePayload = {
        settings: settingsData
    };

    // Tìm và cập nhật invitation dựa trên ID và user ID
    // Lệnh $set sẽ ghi đè toàn bộ object 'settings' bằng dữ liệu mới nhất
    return await Invitation.findOneAndUpdate(
        { _id: invitationId, user: userId },
        { $set: updatePayload },
        { new: true, runValidators: true }
    ).populate('template guests');
};



// --- MỚI: Quản lý Nhóm khách mời ---

/**
 * Thêm một nhóm khách mời mới vào thiệp.
 * @param {string} invitationId - ID của thiệp.
 * @param {string} userId - ID của chủ thiệp.
 * @param {object} groupData - Dữ liệu nhóm (name, salutation).
 * @returns {Promise<Document|null>} Thiệp mời đã được cập nhật.
 */
const addGuestGroupToInvitation = async (invitationId, userId, groupData) => {
    const invitation = await Invitation.findOne({ _id: invitationId, user: userId });
    if (!invitation) {
        throw new Error('Không tìm thấy thiệp hoặc bạn không có quyền.');
    }

    // Kiểm tra trùng tên nhóm trong thiệp này
    const existingGroup = invitation.guestGroups.find(g => g.name === groupData.name);
    if (existingGroup) {
        throw new Error('Tên nhóm đã tồn tại.');
    }

    invitation.guestGroups.push(groupData);
    return await invitation.save();
};

/**
 * Lấy tất cả nhóm khách mời của một thiệp.
 * @param {string} invitationId - ID của thiệp.
 * @param {string} userId - ID của chủ thiệp.
 * @returns {Promise<Array>} Mảng các nhóm khách mời.
 */
const getGuestGroupsByInvitationId = async (invitationId, userId) => {
    const invitation = await Invitation.findOne({ _id: invitationId, user: userId }).select('guestGroups');
    if (!invitation) {
        throw new Error('Không tìm thấy thiệp hoặc bạn không có quyền.');
    }
    return invitation.guestGroups;
};

/**
 * Cập nhật thông tin một nhóm khách mời trong thiệp.
 * @param {string} invitationId - ID của thiệp.
 * @param {string} groupId - ID của nhóm cần cập nhật.
 * @param {string} userId - ID của chủ thiệp.
 * @param {object} updateData - Dữ liệu mới của nhóm (name, salutation).
 * @returns {Promise<Document|null>} Thiệp mời đã được cập nhật.
 */
const updateGuestGroupInInvitation = async (invitationId, groupId, userId, updateData) => {
    const invitation = await Invitation.findOne({ _id: invitationId, user: userId });
    if (!invitation) {
        throw new Error('Không tìm thấy thiệp hoặc bạn không có quyền.');
    }

    const group = invitation.guestGroups.id(groupId);
    if (!group) {
        throw new Error('Không tìm thấy nhóm khách mời.');
    }

    // Kiểm tra trùng tên nếu tên đang được cập nhật
    if (updateData.name && updateData.name !== group.name) {
        const existingGroup = invitation.guestGroups.find(g => g.name === updateData.name && g._id.toString() !== groupId);
        if (existingGroup) {
            throw new Error('Tên nhóm đã tồn tại.');
        }
    }

    group.set(updateData);
    return await invitation.save();
};

/**
 * Xóa một nhóm khách mời khỏi thiệp.
 * @param {string} invitationId - ID của thiệp.
 * @param {string} groupId - ID của nhóm cần xóa.
 * @param {string} userId - ID của chủ thiệp.
 * @returns {Promise<Document|null>} Thiệp mời đã được cập nhật.
 */
const removeGuestGroupFromInvitation = async (invitationId, groupId, userId) => {
    const invitation = await Invitation.findOne({ _id: invitationId, user: userId });
    if (!invitation) {
        throw new Error('Không tìm thấy thiệp hoặc bạn không có quyền.');
    }

    // Find the index of the group to remove
    const groupIndex = invitation.guestGroups.findIndex(g => g._id.toString() === groupId);
    if (groupIndex === -1) {
        throw new Error('Không tìm thấy nhóm khách mời.'); // Group not found
    }

    // Remove the group using splice
    invitation.guestGroups.splice(groupIndex, 1);
    
    return await invitation.save();
};

/**
 * MỚI: Gửi email thiệp mời đến một khách mời cụ thể.
 * @param {string} invitationId - ID của thiệp mời.
 * @param {string} guestId - ID của khách mời.
 * @param {string} userId - ID của chủ thiệp.
 * @returns {Promise<Object>} Trả về thông tin khách mời đã được cập nhật trạng thái email.
 */
const sendInvitationEmailToGuest = async (invitationId, guestId, userId) => {
    const invitation = await Invitation.findOne({ _id: invitationId, user: userId });
    if (!invitation) {
        throw new Error('Không tìm thấy thiệp hoặc bạn không có quyền.');
    }

    const guest = invitation.guests.id(guestId);
    if (!guest) {
        throw new Error('Không tìm thấy khách mời.');
    }

    if (!guest.email) {
        throw new Error('Khách mời không có địa chỉ email.');
    }

    const { emailSubject, emailBody, salutationStyle } = invitation.settings;
    const { name, salutation, _id: finalGuestId } = guest;

    // --- URL ĐỘNG DỰA TRÊN INVITATION ID ---
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    // URL mới: /events/60f...abc?guestId=60f...xyz
    const destinationUrl = `${frontendBaseUrl}/events/${invitation._id}?guestId=${finalGuestId}`;
    
    const finalSubject = (emailSubject || '').replace('{TênKháchMời}', name).replace('{LờiXưngHô}', salutation || salutationStyle);

    const personalizedBody = `
        <p><b>${salutation || salutationStyle} ${name},</b></p>
    `;

    const finalBody = (emailBody || '').replace(/\n/g, '<br>');

    // ---- START: NÂNG CẤP TOÀN BỘ GIAO DIỆN EMAIL ----
    const fullHtmlBody = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${finalSubject}</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                width: 100% !important;
                background-color: #f4f4f4;
                font-family: 'Roboto', Arial, sans-serif;
            }
            .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
            }
            .content {
                padding: 30px;
                text-align: center;
                font-size: 16px;
                line-height: 1.6;
                color: #333333;
            }
            .header {
                padding: 20px 0;
                text-align: center;
                background-color: #ffffff;
            }
            .header img {
                max-width: 180px;
            }
            .button {
                display: inline-block;
                padding: 12px 25px;
                margin-top: 25px;
                font-family: 'Roboto', Arial, sans-serif;
                font-size: 16px;
                font-weight: bold;
                color: #ffffff !important;
                background-color: #f7a600; /* Màu cam chủ đạo của website */
                border-radius: 5px;
                text-decoration: none;
                transition: background-color 0.3s ease;
            }
            .button:hover {
                background-color: #e69500; /* Màu cam đậm hơn khi hover */
            }
            .footer {
                text-align: center;
                padding: 20px;
                font-size: 12px;
                color: #999999;
            }
        </style>
    </head>
    <body>
        <table width="100%" border="0" cellspacing="0" cellpadding="20" style="background-color: #f4f4f4;">
            <tr>
                <td align="center">
                    <table class="container" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td class="header">
                                <img src="https://baotrithangmay.vn/wp-content/uploads/2024/02/logo-HNE.png" alt="Thang máy HNE Logo">
                            </td>
                        </tr>

                        <tr>
                            <td class="content">
                                ${personalizedBody}
                                <p style="margin: 0;">${finalBody}</p>
                                <a href="${destinationUrl}" class="button">
                                    Tìm hiểu thêm về chúng tôi
                                </a>
                            </td>
                        </tr>
                        
                        <tr>
                            <td class="footer">
                                © ${new Date().getFullYear()} Công ty TNHH Thang máy HNE. All rights reserved.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
    // ---- END: NÂNG CẤP TOÀN BỘ GIAO DIỆN EMAIL ----

    const transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: guest.email,
        subject: finalSubject,
        html: fullHtmlBody, 
    };

    try {
        await transporter.sendMail(mailOptions);
        guest.emailStatus = 'Đã gửi';
        await invitation.save();
        return guest;
    } catch (error) {
        console.error('Lỗi khi gửi email:', error);
        guest.emailStatus = 'Thất bại';
        await invitation.save();
        throw new Error('Gửi email thất bại.');
    }
};
/**
 * [MỚI]
 * Lấy một thiệp mời công khai bằng ID của nó, kèm thông tin khách mời nếu có.
 * @param {string} invitationId - ID của thiệp mời.
 * @param {string} guestId - ID của khách mời (tùy chọn).
 * @returns {Promise<Document|null>} Thiệp mời và thông tin khách mời.
 */
const getPublicInvitationById = async (invitationId, guestId = null) => {
    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
        throw new Error('ID thiệp mời không hợp lệ.');
    }

    // THAY ĐỔI: Thêm .populate('template') để lấy dữ liệu từ template
    const invitation = await Invitation.findById(invitationId).populate('template');

    if (!invitation) {
        return null;
    }

    let guestDetails = null;
    if (guestId && mongoose.Types.ObjectId.isValid(guestId)) {
        const guest = invitation.guests.id(guestId);
        if (guest) {
            guestDetails = guest.toObject(); 
        }
    }
    
    // TRẢ VỀ DỮ LIỆU ĐẦY ĐỦ BAO GỒM CẢ TEMPLATE
    const publicInvitationData = {
        _id: invitation._id,
        slug: invitation.slug,
        settings: invitation.settings,
        content: invitation.content,
        design: invitation.design,
        guestDetails: guestDetails,
        template: invitation.template, // <-- THÊM DÒNG NÀY
    };

    return publicInvitationData;
};


/**
 * Cập nhật trạng thái tham dự (RSVP) cho một khách mời cụ thể.
 * Hàm này không yêu cầu xác thực người dùng (userId).
 * @param {string} invitationId ID của thiệp mời.
 * @param {string} guestId ID của khách mời.
 * @param {object} rsvpData Dữ liệu phản hồi ({ status, attendingCount }).
 * @returns {Promise<Document|null>}
 */
const updateGuestRsvp = async (invitationId, guestId, rsvpData) => {
    // Tìm thiệp mời chỉ bằng ID, không cần userId
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
        throw new Error('Không tìm thấy thiệp mời.');
    }

    // Tìm khách mời trong thiệp đó
    const guest = invitation.guests.id(guestId);
    if (!guest) {
        throw new Error('Không tìm thấy thông tin khách mời.');
    }

    // Cập nhật các trường liên quan đến RSVP
    guest.status = rsvpData.status;
    guest.attendingCount = rsvpData.attendingCount;
    
    // Lưu lại sự thay đổi
    await invitation.save();
    return guest;
};


module.exports = {
    createInvitationFromTemplate,
    getInvitationBySlug,
    getInvitationsByUserId,
    getInvitationByIdAndUser,
    updateInvitation,
    deleteInvitation,
    addGuestToInvitation,
    updateGuestInInvitation,
    removeGuestFromInvitation,
    addWishToInvitation,
    updateInvitationSettings, // NEW
    addGuestGroupToInvitation, // NEW
    getGuestGroupsByInvitationId, // NEW
    updateGuestGroupInInvitation, // NEW
    removeGuestGroupFromInvitation, // NEW
    sendInvitationEmailToGuest, // MỚI: Gửi email
    getPublicInvitationById,
    updateGuestRsvp,
};
