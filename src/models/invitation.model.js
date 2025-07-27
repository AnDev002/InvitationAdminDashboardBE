const mongoose = require('mongoose');

// Giữ nguyên Guest Schema và Wish Schema
const guestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: String,
    email: { type: String },
    group: String, // Keep as string for group name
    status: { type: String, enum: ['pending', 'attending', 'declined'], default: 'pending' },
    attendingCount: { type: Number, default: 1 },
    giftAmount: { type: Number, default: 0, min: [0, 'Số tiền mừng không thể là số âm'] },
    giftUnit: { type: String, default: 'VND' }, // Thêm trường này từ frontend
    salutation: { type: String, default: 'Lời xưng hô mặc định' }, // Thêm trường này từ frontend
    emailStatus: { type: String, enum: ['Chưa gửi', 'Đã gửi', 'Thất bại'], default: 'Chưa gửi' } // MỚI: Trạng thái gửi email
});

const wishSchema = new mongoose.Schema({
    author: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const canvasItemSchema = new mongoose.Schema({
    id: { type: String, required: true }, // uuid từ frontend
    type: { type: String, required: true, enum: ['text', 'image'] },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 100 },
    height: { type: Number, default: 100 },
    rotation: { type: Number, default: 0 },
    opacity: { type: Number, default: 1 },
    visible: { type: Boolean, default: true },
    locked: { type: Boolean, default: false },
    zIndex: { type: Number, default: 100 },

    // Thuộc tính riêng của Text item (chỉ tồn tại khi type là 'text')
    content: { type: String },
    fontFamily: { type: String },
    fontSize: { type: Number },
    color: { type: String },
    fontWeight: { type: String },
    isEditing: { type: Boolean }, // Thuộc tính frontend, có thể lưu hoặc bỏ qua tùy ý

    // Thuộc tính riêng của Image item (chỉ tồn tại khi type là 'image')
    url: { type: String },
    brightness: { type: Number },
    contrast: { type: Number },
    grayscale: { type: Number },
}, { _id: false, strict: false });

// Schema cho một trang canvas
const canvasPageSchema = new mongoose.Schema({
    id: { type: String, required: true }, // uuid từ frontend
    name: { type: String, default: 'Trang' },
    canvasWidth: { type: Number, default: 800 },
    canvasHeight: { type: Number, default: 600 },
    backgroundImage: { type: String }, // URL của ảnh nền, nếu mỗi trang có ảnh nền riêng
    items: [canvasItemSchema], // Mảng các item trên trang
}, { _id: false });

// MỚI: Schema cho các nhóm khách mời
const guestGroupSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    salutation: { type: String, required: true, default: 'Thân gửi' }
}, { _id: true }); // Mongoose sẽ tự động thêm _id cho subdocument

const invitationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    
    template: { type: mongoose.Schema.ObjectId, ref: 'InvitationTemplate', required: true },

    slug: { type: String, required: true, unique: true, trim: true },

    // 'content' bây giờ là một mảng các canvasPageSchema
    content: {
        type: [canvasPageSchema],
        required: true,
        default: []
    },

    design: { // Phần design này có thể vẫn hữu ích cho các thuộc tính global của thiệp
        themeColor: { type: String, default: '#ffffff' },
        fontFamily: { type: String, default: 'Arial, sans-serif' },
    },

    guests: [guestSchema],
    wishes: [wishSchema],
    // Cập nhật cài đặt với các trường mới từ frontend
    settings: {
        showWishList: { type: Boolean, default: true },
        showGuestList: { type: Boolean, default: false },
        password: { type: String },
        // Các trường mới từ InvitationSettingsPanel
        title: { type: String, default: '{LờiXưngHô} {TênKháchMời} ! - Thiệp mời online' },
        description: { type: String, default: '{LờiXưngHô} {TênKháchMời} đến tham dự buổi tiệc chung vui cùng gia đình chúng tôi!' },
        salutationStyle: { type: String, default: 'Thân gửi', enum: ['Thân gửi', 'Kính mời', 'Trân trọng kính mời'] },
        displayStyle: { type: String, default: 'Kiểu 1', enum: ['Kiểu 1', 'Kiểu 2'] },
        emailSubject: { type: String, default: '{LờiXưngHô} {TênKháchMời} Đến tham dự buổi tiệc cùng gia đình chúng tôi! - Thiệp mời online' },
        emailBody: { type: String, default: 'Một dấu mốc quan trọng đang đến và chúng tôi rất mong có bạn đồng hành trong khoảnh khắc đáng nhớ này.\nTrân trọng mời bạn tham dự sự kiện đặc biệt của chúng tôi.\nSự hiện diện của bạn là món quà ý nghĩa nhất mà chúng tôi có thể mong chờ!\n\nTrân trọng,\nBiihappy' },
        
        eventDate: { type: Date, default: () => new Date() },
        
        groomName: { type: String, default: 'Chú rể' },
        brideName: { type: String, default: 'Cô dâu' },
        
        groomInfo: { type: String, default: 'Thông tin về chú rể...' },
        brideInfo: { type: String, default: 'Thông tin về cô dâu...' },

        groomImageUrl: { type: String, default: 'https://placehold.co/400x400/E9ECEF/333?text=Chú+Rể' },
        brideImageUrl: { type: String, default: 'https://placehold.co/400x400/F8F9FA/333?text=Cô+Dâu' },

        heroImages: {
            main: { type: String, default: 'https://placehold.co/800x1200/cccccc/ffffff?text=Ảnh+cưới+1' },
            sub1: { type: String, default: 'https://placehold.co/800x590/cccccc/ffffff?text=Ảnh+cưới+2' },
            sub2: { type: String, default: 'https://placehold.co/800x590/cccccc/ffffff?text=Ảnh+cưới+3' }
        },
        
        galleryImages: [
            { type: String, default: 'https://placehold.co/1520x800/E9ECEF/333?text=Ảnh+cưới' },
            { type: String, default: 'https://placehold.co/1520x800/F1F3F5/333?text=Ảnh+cưới' }
        ],

        contactGroom: { type: String, default: '09xxxxxxxx' },
        contactBride: { type: String, default: '08xxxxxxxx' }
    },
    // MỚI: Mảng để lưu trữ các nhóm khách mời tùy chỉnh cho thiệp này
    guestGroups: [guestGroupSchema],
}, { timestamps: true });


const Invitation = mongoose.model('Invitation', invitationSchema);
module.exports = Invitation;
