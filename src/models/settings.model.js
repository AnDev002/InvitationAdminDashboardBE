const mongoose = require('mongoose');

const navItemSchema = new mongoose.Schema({
    id: { type: String, required: true }, 
    title: { type: String, required: true },
    path: { type: String, required: true },
    order: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true }
}, { _id: false });

const settingsSchema = new mongoose.Schema({
    singletonKey: { type: String, default: "main_settings", unique: true },
    livePreviewUrl: { type: String, default: "https://baotrithangmay.vn" },
    headerNav: [navItemSchema],
    theme: {
        primaryColor: String,
        fontFamily: String,
        customFontUrl: String,
        logoUrl: String,
        announcementBar: { text: String, isEnabled: Boolean }
    },
    banners: Object,
    footer: Object,
    seo: Object,
});

const Setting = mongoose.model('Setting', settingsSchema);

Setting.findOne({ singletonKey: "main_settings" }).then(settings => {
    if (!settings) {
        console.log("Creating default settings document...");
        Setting.create({ singletonKey: "main_settings" });
    }
});

module.exports = Setting;