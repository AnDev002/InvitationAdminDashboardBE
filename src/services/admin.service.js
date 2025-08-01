const Product = require('../models/product.model');
const Template = require('../models/invitationTemplate.model');
const Setting = require('../models/settings.model');
const User = require('../models/user.model');
const Invitation = require('../models/invitation.model');

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


const updateSettings = async (updateData) => {
    return await Setting.findOneAndUpdate(
        { singletonKey: "main_settings" },
        updateData,
        { new: true, upsert: true, runValidators: true }
    );
};

module.exports = {
    getDashboardData,
    getSettings,
    updateSettings
};