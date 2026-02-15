// TrainData/AdminBE/models/page.model.js
const mongoose = require('mongoose');

// Schema cho các khối nội dung
// const contentBlockSchema = new mongoose.Schema({
//     type: {
//         type: String,
//         required: true,
//         enum: ['text', 'image'],
//     },
//     content: { 
//         type: mongoose.Schema.Types.Mixed,
//         default: '' 
//     },
//     alt: {
//         type: String
//     },
// }, { _id: true });

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
        type: mongoose.Schema.Types.Mixed,
        default: '',
    },
    isBlog: {
        type: Boolean,
        default: false,
        index: true,
    },
    category: {
        type: mongoose.Schema.ObjectId,
        ref: 'PageCategory'
    },
    topics: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Topic'
    }],
    relatedProducts: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Product' 
    }],
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
    order: {
        type: Number,
        default: 0
    },
    thumbnail: {
        type: String,
        default: null 
    },
    summary: {
        type: String, 
        trim: true,
        maxLength: 500 
    },
}, { timestamps: true });

// Pre-save hook
pageSchema.pre('save', async function(next) {
    if (!this.slug) {
        this.slug = this.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    }
    if (this.isNew) {
        const highestOrderPage = await this.constructor.findOne().sort('-order');
        this.order = (highestOrderPage && typeof highestOrderPage.order === 'number') ? highestOrderPage.order + 1 : 1;
    }
    next();
});

// Populate hook
pageSchema.pre(/^find/, function(next) {
    this.populate('author', 'name')
        .populate('category', 'name slug')
        .populate('topics', 'name slug');
    next();
});

const Page = mongoose.model('Page', pageSchema);

// === SỬA TẠI ĐÂY: Export trực tiếp Model thay vì object ===
module.exports = Page;