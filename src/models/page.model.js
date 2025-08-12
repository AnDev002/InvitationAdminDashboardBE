// TrainData/AdminBE/models/page.model.js
const mongoose = require('mongoose');

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
    // --- THAY ĐỔI: Chuyển content thành một chuỗi duy nhất ---
    content: {
        type: String,
        default: '',
    },
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
    }
}, { timestamps: true });

// Tự động tạo slug từ title nếu slug không được cung cấp
pageSchema.pre('save', function(next) {
    if (!this.isModified('slug') && this.title) {
        this.slug = this.title.toLowerCase()
            .replace(/[^\w\s-]/g, '') // remove non-word chars
            .replace(/[\s_-]+/g, '-') // collapse whitespace and replace by -
            .replace(/^-+|-+$/g, ''); // remove leading/trailing dashes
    }
    next();
});

const Page = mongoose.model('Page', pageSchema);

module.exports = Page;