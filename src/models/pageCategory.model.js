const mongoose = require('mongoose');

const pageCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên danh mục là bắt buộc.'],
        trim: true,
        unique: true,
    },
    slug: {
        type: String,
        required: [true, 'Đường dẫn (slug) là bắt buộc.'],
        unique: true,
        trim: true,
        lowercase: true,
    },
}, { timestamps: true });

pageCategorySchema.pre('save', function(next) {
    if (!this.slug) {
        this.slug = this.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    }
    next();
});

const PageCategory = mongoose.model('PageCategory', pageCategorySchema);

module.exports = PageCategory;