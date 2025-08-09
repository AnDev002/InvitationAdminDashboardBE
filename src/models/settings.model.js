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
        announcementBar: { 
            text: String, 
            isEnabled: Boolean,
            backgroundColor: String, 
            textColor: String,    
            link: String,
            backgroundImage: String
        }
    },
    banners: {
        home: { imageUrl: String, title: String, subtitle: String },
        home_secondary_1: { imageUrl: String, title: String, subtitle: String },
        home_secondary_2: { imageUrl: String, title: String, subtitle: String },
        professional: { imageUrl: String, title: String, subtitle: String },
        professional_secondary_1: { imageUrl: String, title: String, subtitle: String },
        invitations: { imageUrl: String, title: String, subtitle: String },
        shop: { imageUrl: String, title: String, subtitle: String },
    },
    footer: Object,
    
    seo: {
        pages: {
            home: {
                title: String,
                description: String,
                keywords: String,
                social: { ogTitle: String, ogDescription: String, ogImage: String }
            },
            products: { 
                title: String,
                description: String,
                keywords: String,
                social: { ogTitle: String, ogDescription: String, ogImage: String }
            },
            invitations: { 
                title: String,
                description: String,
                keywords: String,
                social: { ogTitle: String, ogDescription: String, ogImage: String }
            },
        },
        global: {
            robotsTxt: { type: String, default: "User-agent: *\nAllow: /" },
            organizationSchema: { type: mongoose.Schema.Types.Mixed }
        },
        redirects: [{
            id: String,
            source: String,
            destination: String,
            type: { type: String, enum: ['301', '302'] }
        }]
    }
});

const Setting = mongoose.model('Setting', settingsSchema);

Setting.findOne({ singletonKey: "main_settings" }).then(settings => {
    if (!settings) {
        console.log("Creating default settings document...");
        Setting.create({ singletonKey: "main_settings" });
    }
});

module.exports = Setting;