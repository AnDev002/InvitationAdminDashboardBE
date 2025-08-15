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

    const hotProducts = await Product.find().sort({ clicks: -1 }).limit(5).select('title clicks');
    const formattedHotProducts = hotProducts.map(p => ({ id: p._id, name: p.title, clicks: p.clicks || 0 }));

    const hotTemplates = await Template.find()
        .sort({ views: -1 })
        .limit(5)
        .select('title views');

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
        hotTemplates: formattedHotTemplates,
        lowStockProducts
    };
};


const getSettings = async () => {
    let settings = await Setting.findOne({ singletonKey: "main_settings" });
    if (!settings) {
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
        settings = new Setting(settingsData);
    } else {
        // Merge các object lồng nhau một cách cẩn thận
        settings.livePreviewUrl = settingsData.livePreviewUrl || settings.livePreviewUrl;
        settings.theme = _.merge(settings.theme || {}, settingsData.theme);
        settings.banners = _.merge(settings.banners || {}, settingsData.banners);
        settings.footer = _.merge(settings.footer || {}, settingsData.footer);
        settings.seo = _.merge(settings.seo || {}, settingsData.seo);

        // Đánh dấu đã sửa đổi cho các đối tượng kiểu Mixed
        if (settingsData.footer) {
            settings.markModified('footer');
        }
        if (settingsData.seo) {
            settings.markModified('seo');
        }
    }

    await settings.save();
    return settings;
};

/**
 * Lấy tất cả các taxonomies (category, group, type) từ các mẫu thiệp mời.
 */
const getInvitationTaxonomies = async () => {
    const categories = await Template.distinct('category');
    const groups = await Template.distinct('group');
    const types = await Template.distinct('type');
    return {
        categories: categories.filter(c => c), // Lọc bỏ giá trị null hoặc rỗng
        groups: groups.filter(g => g),
        types: types.filter(t => t)
    };
};

/**
 * Cập nhật một taxonomy (category, group, type) cho tất cả các mẫu thiệp liên quan.
 * @param {string} taxonomyType - 'category', 'group', or 'type'
 * @param {string} oldName - Tên hiện tại của taxonomy.
 * @param {string} newName - Tên mới cho taxonomy.
 */
const updateInvitationTaxonomy = async (taxonomyType, oldName, newName) => {
    const update = { $set: { [taxonomyType]: newName } };
    const filter = { [taxonomyType]: oldName };
    const result = await Template.updateMany(filter, update);
    return result;
};

/**
 * Xóa một taxonomy. Thay thế nó bằng 'Chưa phân loại'.
 * @param {string} taxonomyType - 'category', 'group', or 'type'
 * @param {string} name - Tên của taxonomy cần xóa.
 */
const deleteInvitationTaxonomy = async (taxonomyType, name) => {
    const update = { $set: { [taxonomyType]: 'Chưa phân loại' } };
    const filter = { [taxonomyType]: name };
    const result = await Template.updateMany(filter, update);
    return result;
};

/**
 * Lấy cấu trúc menu điều hướng (header).
 */

const getNavigation = async () => {
    const settings = await getSettings();
    if (settings.headerNav && settings.headerNav.length > 0) {
        return settings.headerNav;
    }

    // --- Logic tự động tạo cây nếu headerNav rỗng ---
    console.log("Header navigation not found, generating from templates...");
    const templates = await Template.find().select('category group type').lean();
    
    const grouped = _.groupBy(templates, 'category');
    
    const generatedNav = Object.keys(grouped).map(categoryName => {
        const groupsUnderCategory = _.groupBy(grouped[categoryName], 'group');
        return {
            id: _.uniqueId('category_'),
            title: categoryName,
            path: `/thiep-moi/${_.kebabCase(categoryName)}`,
            type: 'category',
            originalName: categoryName,
            isVisible: true,
            children: Object.keys(groupsUnderCategory).map(groupName => {
                const typesUnderGroup = _.uniqBy(groupsUnderCategory[groupName], 'type');
                return {
                    id: _.uniqueId('group_'),
                    title: groupName,
                    path: `/thiep-moi/${_.kebabCase(categoryName)}/${_.kebabCase(groupName)}`,
                    type: 'group',
                    originalName: groupName,
                    isVisible: true,
                    children: typesUnderGroup.map(t => ({
                        id: _.uniqueId('type_'),
                        title: t.type,
                        path: `/thiep-moi/${_.kebabCase(categoryName)}/${_.kebabCase(groupName)}/${_.kebabCase(t.type)}`,
                        type: 'type',
                        originalName: t.type,
                        isVisible: true,
                        children: [],
                    }))
                };
            })
        };
    });

    // Lưu lại cây vừa tạo để lần sau không cần tạo lại
    await updateNavigation(generatedNav);
    return generatedNav;
};

/**
 * Cập nhật cấu trúc menu điều hướng (header).
 * @param {Array} navData - Mảng các mục menu mới (cấu trúc cây).
 */
const updateNavigation = async (navData) => {
    const settings = await Setting.findOneAndUpdate(
        { singletonKey: "main_settings" },
        { $set: { headerNav: navData } },
        { new: true, upsert: true } // upsert: tạo mới nếu chưa tồn tại
    );
    return settings.headerNav;
};
const updateGroupOrderInCategory = async (categoryName, orderedGroups) => {
    const settings = await getSettings(); // Dùng lại hàm getSettings để đảm bảo có document settings

    // Khởi tạo đối tượng groupOrder nếu chưa có
    if (!settings.seo) {
        settings.seo = {};
    }
    if (!settings.seo.groupOrder) {
        settings.seo.groupOrder = {};
    }

    // Gán mảng thứ tự mới cho danh mục tương ứng
    settings.seo.groupOrder[categoryName] = orderedGroups;

    // Đánh dấu trường đã bị thay đổi để Mongoose biết cần phải lưu
    settings.markModified('seo.groupOrder');
    
    await settings.save();
    return settings.seo.groupOrder;
};




module.exports = {
    getDashboardData,
    getSettings,
    updateSettings,
    getInvitationTaxonomies,
    updateInvitationTaxonomy,
    deleteInvitationTaxonomy,
    getNavigation,
    updateNavigation,
    updateGroupOrderInCategory
};