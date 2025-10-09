const Product = require('../models/product.model');
const Template = require('../models/invitationTemplate.model');
const { Setting } = require('../models/settings.model');
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
    let settings = await Setting.findOne({ singletonKey: "main_settings" });

    if (!settings) {
        console.log("Creating new settings document during update...");
        return await Setting.create({ singletonKey: "main_settings", ...settingsData });
    }

    // =======================================================================
    // === BẮT ĐẦU SỬA LỖI: LOGIC PHÒNG VỆ VÀ SỬA DỮ LIỆU TỰ ĐỘNG ===
    // =======================================================================
    // Hàm này sẽ đệ quy qua các mục nav và thêm trường 'type' nếu nó bị thiếu.
    // Điều này giúp dữ liệu luôn hợp lệ với schema mới nhất.
    const ensureNavItemsHaveType = (items, level = 0) => {
        if (!items || !Array.isArray(items)) {
            return [];
        }
        return items.map(item => {
            const newItem = { ...item };
            if (!newItem.type) {
                if (level === 0) newItem.type = 'category';
                else if (level === 1) newItem.type = 'group';
                else newItem.type = 'type';
            }
            if (newItem.children) {
                newItem.children = ensureNavItemsHaveType(newItem.children, level + 1);
            }
            return newItem;
        });
    };

    // Trước khi cập nhật, kiểm tra và sửa lại `headerNav` nếu cần thiết.
    if (settingsData.headerNav) {
        settingsData.headerNav = ensureNavItemsHaveType(settingsData.headerNav);
    }
    // =======================================================================
    // === KẾT THÚC SỬA LỖI ===
    // =======================================================================

    // Sử dụng lodash.mergeWith để hợp nhất dữ liệu, nhưng thay thế hoàn toàn các mảng.
    // Điều này đảm bảo rằng việc xóa các mục trong mảng (như banner, link) từ frontend
    // sẽ được phản ánh chính xác trong cơ sở dữ liệu.
    const customizer = (objValue, srcValue) => {
        if (_.isArray(srcValue)) {
            return srcValue;
        }
    };

    _.mergeWith(settings, settingsData, customizer);

    // Đánh dấu các đường dẫn có cấu trúc phức tạp là đã bị sửa đổi để Mongoose biết và lưu lại.
    settings.markModified('theme');
    settings.markModified('banners');
    settings.markModified('footer');
    settings.markModified('seo');
    settings.markModified('headerNav');

    await settings.save(); // Lưu lại các thay đổi vào DB.
    return settings;
};




module.exports = {
    getDashboardData,
    getSettings,
    updateSettings
};