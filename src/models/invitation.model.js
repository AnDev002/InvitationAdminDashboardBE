const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: String,
    email: { type: String },
    group: String, 
    status: { type: String, enum: ['pending', 'attending', 'declined'], default: 'pending' },
    attendingCount: { type: Number, default: 1 },
    giftAmount: { type: Number, default: 0, min: [0, 'Số tiền mừng không thể là số âm'] },
    giftUnit: { type: String, default: 'VND' }, 
    salutation: { type: String, default: 'Trân trọng kính mời' }, 
    emailStatus: { type: String, enum: ['Chưa gửi', 'Đã gửi', 'Thất bại'], default: 'Chưa gửi' } 
});

const wishSchema = new mongoose.Schema({
    author: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const canvasItemSchema = new mongoose.Schema({
    id: { type: String, required: true }, 
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
    content: { type: String },
    fontFamily: { type: String },
    fontSize: { type: Number },
    color: { type: String },
    fontWeight: { type: String, default: 'normal' },
    fontStyle: { type: String, default: 'normal' }, // NEW
    textDecoration: { type: String, default: 'none' }, // NEW
    textAlign: { type: String, default: 'center' }, // NEW
    isEditing: { type: Boolean }, 
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
    backgroundColor: { type: String, default: '#FFFFFF' }, // NEW
    backgroundImage: { type: String }, // URL của ảnh nền, nếu mỗi trang có ảnh nền riêng
    items: [canvasItemSchema], // Mảng các item trên trang
}, { _id: false });

// MỚI: Schema cho các nhóm khách mời
const guestGroupSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    salutation: { type: String, required: true, default: 'Thân gửi' }
}, { _id: true }); // Mongoose sẽ tự động thêm _id cho subdocument

const imagePositionSchema = new mongoose.Schema({
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    scale: { type: Number, default: 1 }
}, { _id: false });

const invitationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    template: { type: mongoose.Schema.ObjectId, ref: 'InvitationTemplate', required: true },
    slug: { type: String, required: true, unique: true, trim: true },
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
        emailBody: { type: String, default: 'Một dấu mốc quan trọng đang đến và chúng tôi rất mong có bạn đồng hành trong khoảnh khắc đáng nhớ này.\nTrân trọng mời bạn tham dự sự kiện đặc biệt của chúng tôi.\nSự hiện diện của bạn là món quà ý nghĩa nhất mà chúng tôi có thể mong chờ!\n\nTrân trọng,\niCard' },
        eventDate: { type: Date, default: () => new Date() },
        
        groomName: { type: String, default: 'Chú rể' },
        brideName: { type: String, default: 'Cô dâu' },
        groomInfo: { type: String, default: 'Thông tin về chú rể...' },
        brideInfo: { type: String, default: 'Thông tin về cô dâu...' },
        groomImageUrl: { type: String, default: 'https://placehold.co/400x400/E9ECEF/333?text=Chú+Rể' },
        groomImagePosition: { type: imagePositionSchema, default: () => ({ x: 0, y: 0, scale: 1 }) },
        brideImageUrl: { type: String, default: 'https://placehold.co/400x400/F8F9FA/333?text=Cô+Dâu' },
        brideImagePosition: { type: imagePositionSchema, default: () => ({ x: 0, y: 0, scale: 1 }) },
        heroImages: {
            main: { type: String, default: 'https://placehold.co/800x1200/cccccc/ffffff?text=Ảnh+cưới+1' },
            sub1: { type: String, default: 'https://placehold.co/800x590/cccccc/ffffff?text=Ảnh+cưới+2' },
            sub2: { type: String, default: 'https://placehold.co/800x590/cccccc/ffffff?text=Ảnh+cưới+3' }
        },
        galleryImages: [
            { type: String, default: 'https://placehold.co/1520x800/E9ECEF/333?text=Ảnh+cưới' },
            { type: String, default: 'https://placehold.co/1520x800/F1F3F5/333?text=Ảnh+cưới' }
        ],
        invitationType: { 
            type: String, 
            enum: ['Thiệp cưới', 'Thiệp sinh nhật', 'Thiệp sự kiện chung', 'Thiệp cảm ơn'], 
            default: 'Thiệp cưới' 
        },
        eventDescription: { 
            type: String, 
            default: 'Trân trọng kính mời bạn tới tham dự sự kiện quan trọng và cùng chia vui với gia đình chúng tôi.' 
        },
        bannerImages: [{ type: String }],
        eventLocation: {
            address: { type: String, default: '' },
            lat: { type: Number, default: 21.028511 }, // Mặc định là Hà Nội
            lng: { type: Number, default: 105.804817 } // Mặc định là Hà Nội
        },
        loveStory: [{
            id: String,
            title: String,
            date: String,
            description: String,
            imageUrl: String 
        }],
        contactGroom: { type: String, default: '09xxxxxxxx' },
        contactBride: { type: String, default: '08xxxxxxxx' },
        musicUrl: { type: String, default: '' },
        videoUrl: { type: String, default: '' },
        qrCodes: [
            {
                title: { type: String, trim: true },
                url: { type: String, trim: true },
            },
        ],
        
        // Block 2
        groomName2: { type: String, default: '' },
        brideName2: { type: String, default: '' },
        groomInfo2: { type: String, default: '' },
        brideInfo2: { type: String, default: '' },
        groomImageUrl2: { type: String, default: '' },
        brideImageUrl2: { type: String, default: '' },
        heroImages2: { main: { type: String }, sub1: { type: String }, sub2: { type: String } },
        galleryImages2: [{ type: String }],
        eventDescription2: { type: String },
        eventLocation2: { address: { type: String }, lat: { type: Number }, lng: { type: Number } },
        contactGroom2: { type: String },
        contactBride2: { type: String },
        musicUrl2: { type: String },
        videoUrl2: { type: String },
        qrCodes2: [{ title: { type: String }, url: { type: String } }],

        // Block 3
        groomName3: { type: String, default: '' },
        brideName3: { type: String, default: '' },
        groomInfo3: { type: String, default: '' },
        brideInfo3: { type: String, default: '' },
        groomImageUrl3: { type: String, default: '' },
        brideImageUrl3: { type: String, default: '' },
        heroImages3: { main: { type: String }, sub1: { type: String }, sub2: { type: String } },
        galleryImages3: [{ type: String }],
        eventDescription3: { type: String },
        eventLocation3: { address: { type: String }, lat: { type: Number }, lng: { type: Number } },
        contactGroom3: { type: String },
        contactBride3: { type: String },
        musicUrl3: { type: String },
        videoUrl3: { type: String },
        qrCodes3: [{ title: { type: String }, url: { type: String } }],
    },
    // MỚI: Mảng để lưu trữ các nhóm khách mời tùy chỉnh cho thiệp này
    customHtmlContent: { type: String, default: '' },
    customHtmlTitle: { type: String, default: 'Nội dung tùy chỉnh' },
    guestGroups: [guestGroupSchema],
}, { timestamps: true });


const Invitation = mongoose.model('Invitation', invitationSchema);
module.exports = Invitation;