// TrainData/AdminBE/models/page.model.js
const mongoose = require('mongoose');

// Schema cho các khối nội dung
const contentBlockSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['text', 'image'],
    },
    content: { // Sẽ chứa text hoặc URL ảnh
        type: String,
        required: true,
    },
    alt: { 
        type: String 
    },
}, { _id: true });


const pageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Tiêu đề trang là bắt buộc.'],
        trim: true,
    },
    slug: {
        type: String,
        required: [true, 'Đường dẫn (slug) là bắt buộc.'],
        unique: true,
        trim: true,
        lowercase: true,
    },
    content: {
        type: [contentBlockSchema],
        default: [],
    },
    isBlog: { 
        type: Boolean,
        default: false,
        index: true,
    },
    // --- BẮT ĐẦU: Thêm trường category ---
    category: {
        type: mongoose.Schema.ObjectId,
        ref: 'PageCategory'
    },
    // --- KẾT THÚC ---
    seo: {
        metaTitle: { type: String, trim: true },
        metaDescription: { type: String, trim: true },
    },
    isPublished: {
        type: Boolean,
        default: false,
        index: true,
    },
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
}, { timestamps: true });

// Tự động tạo slug từ title nếu slug không được cung cấp
pageSchema.pre('save', function(next) {
    if (!this.slug) {
        this.slug = this.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    }
    next();
});

// Middleware để tự động populate author và category khi query
pageSchema.pre(/^find/, function(next) {
    this.populate('author', 'name').populate('category', 'name slug');
    next();
});

const Page = mongoose.model('Page', pageSchema);

// Xuất cả hai model
module.exports = { Page };