const Product = require('../models/product.model');
const Template = require('../models/invitationTemplate.model');
const Setting = require('../models/settings.model');
const User = require('../models/user.model');
const Invitation = require('../models/invitation.model');
const _ = require('lodash');

const getDashboardData = async () => {
    const totalProducts = await Product.countDocuments();
    const totalTemplates = await Template.countDocuments();
    const totalUsers = await User.countDocuments();
    const newOrders = await Invitation.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } }).limit(5).sort({ stock: 1 });

    const formattedDailyStats = []; // Dữ liệu giả định, có thể tích hợp sau

    // Truy vấn sản phẩm hot (giả định dựa trên trường 'clicks' nếu có)
    const hotProducts = await Product.find().sort({ clicks: -1 }).limit(5).select('title clicks');
    const formattedHotProducts = hotProducts.map(p => ({ id: p._id, name: p.title, clicks: p.clicks || 0 }));

    // SỬA LỖI TẠI ĐÂY: Lấy 5 mẫu thiệp có lượt xem cao nhất
    const hotTemplates = await Template.find()
        .sort({ views: -1 }) // Sắp xếp theo lượt xem giảm dần
        .limit(5)           // Giới hạn 5 kết quả
        .select('title views'); // Chỉ lấy trường title và views

    // Định dạng lại dữ liệu để frontend dễ dàng sử dụng
    const formattedHotTemplates = hotTemplates.map(t => ({
        id: t._id,
        name: t.title,
        views: t.views
    }));

    return {
        stats: {
            totalProducts,
            totalTemplates,
            totalUsers,
            newOrders,
            dailyVisitors: formattedDailyStats
        },
        hotProducts: formattedHotProducts,
        hotTemplates: formattedHotTemplates, // Trả về dữ liệu đã được sắp xếp đúng
        lowStockProducts
    };
};


const getSettings = async () => {
    let settings = await Setting.findOne({ singletonKey: "main_settings" });
    if (!settings) {
        // Nếu chưa có, tạo mới với các giá trị mặc định để tránh lỗi null ở frontend
        console.log("Creating default settings document...");
        settings = await Setting.create({
            singletonKey: "main_settings",
            livePreviewUrl: "https://baotrithangmay.vn",
            headerNav: [],
            theme: {
                announcementBar: { text: 'Chào mừng đến với cửa hàng!', isEnabled: true }
            },
            banners: {},
            footer: {
                socialLinks: {},
                columns: []
            },
            seo: {}
        });
    }
    return settings;
};


const updateSettings = async (settingsData) => {
    let settings = await Setting.findOne();

    if (!settings) {
        // If no settings document exists at all, create a new one.
        settings = new Setting(settingsData);
    } else {
        // Settings exist, update them carefully.

        // For plain nested objects (not arrays of documents), merge is safe.
        settings.theme = _.merge(settings.theme || {}, settingsData.theme);
        settings.banners = _.merge(settings.banners || {}, settingsData.banners);

        // For arrays of sub-documents, DIRECTLY REPLACE the array.
        // This is the key fix. It tells Mongoose to process the new array
        // from scratch, correctly casting each item and running validators.
        if (settingsData.footer) {
            if (settingsData.footer.socialLinks) {
                settings.footer.socialLinks = settingsData.footer.socialLinks;
            }
            if (settingsData.footer.columns) {
                settings.footer.columns = settingsData.footer.columns;
            }
            if (settingsData.footer.legalLinks) {
                settings.footer.legalLinks = settingsData.footer.legalLinks;
            }
        }
        
        if (settingsData.headerNav) {
            settings.headerNav = settingsData.headerNav;
        }

        // Mark the footer as modified if it was part of the update.
        // This can sometimes be necessary to let Mongoose know a mixed-type object has changed.
        if (settingsData.footer) {
            settings.markModified('footer');
        }
    }

    // Now, save the updated document. Mongoose validation will run here.
    await settings.save();
    return settings;
};


module.exports = {
    getDashboardData,
    getSettings,
    updateSettings
};