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

const addInvitationTaxonomy = async (taxonomyType, name, parentCategory = 'Chung', parentGroup = 'Chung') => {
    // Để tạo một danh mục mới, chúng ta tạo một mẫu thiệp mời ẩn
    // chứa thông tin danh mục đó.
    const placeholderTemplate = {
        title: `Placeholder-${taxonomyType}-${name}-${Date.now()}`,
        imgSrc: 'https://placehold.co/100x100/eee/ccc?text=Placeholder',
        isActive: false, // Quan trọng: mẫu này sẽ không hiển thị cho người dùng
        templateData: { pages: [] }
    };

    if (taxonomyType === 'category') {
        placeholderTemplate.category = name;
        placeholderTemplate.group = 'Nhóm Mặc định';
        placeholderTemplate.type = 'Loại Mặc định';
    } else if (taxonomyType === 'group') {
        placeholderTemplate.category = parentCategory;
        placeholderTemplate.group = name;
        placeholderTemplate.type = 'Loại Mặc định';
    } else if (taxonomyType === 'type') {
        placeholderTemplate.category = parentCategory;
        placeholderTemplate.group = parentGroup;
        placeholderTemplate.type = name;
    } else {
        throw new Error('Loại danh mục không hợp lệ.');
    }
    
    return await Template.create(placeholderTemplate);
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
    // Sử dụng cấu trúc đã lưu nếu có và không rỗng.
    if (settings.headerNav && settings.headerNav.length > 0) {
        return settings.headerNav;
    }

    console.log("Header navigation not found, generating from templates...");
    // Chỉ lấy các template đang hoạt động để xây dựng cây.
    const templates = await Template.find({ isActive: true }).select('category group type').lean();
    
    // Sử dụng Map để xây dựng cấu trúc phân cấp một cách hiệu quả.
    const categoryMap = new Map();

    // Xử lý từng template để xây dựng cây.
    for (const template of templates) {
        // Bỏ qua các template không có category.
        if (!template.category || template.category === 'undefined' || template.category === 'null') {
            continue;
        }

        const categoryName = template.category;
        // Gán một tên nhóm mặc định nếu group bị thiếu, để đảm bảo type vẫn được hiển thị.
        const groupName = template.group || 'Chưa phân nhóm'; 
        const typeName = template.type;

        // --- Xử lý cấp Category ---
        if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, {
                id: _.uniqueId('category_'),
                title: categoryName,
                path: `/invitations/category/${_.kebabCase(categoryName)}`,
                type: 'category',
                originalName: categoryName,
                isVisible: true,
                children: new Map() // Dùng Map cho group để truy cập và thêm mới dễ dàng.
            });
        }
        
        const categoryNode = categoryMap.get(categoryName);

        // --- Xử lý cấp Group ---
        if (!categoryNode.children.has(groupName)) {
            categoryNode.children.set(groupName, {
                id: _.uniqueId('group_'),
                title: groupName,
                path: `/invitations/category/${_.kebabCase(categoryName)}/${_.kebabCase(groupName)}`,
                type: 'group',
                originalName: groupName,
                isVisible: true,
                children: new Set() // Dùng Set cho type để tự động loại bỏ các giá trị trùng lặp.
            });
        }

        const groupNode = categoryNode.children.get(groupName);

        // --- Xử lý cấp Type ---
        if (typeName && typeName !== 'undefined' && typeName !== 'null') {
            groupNode.children.add(typeName);
        }
    }

    // Chuyển đổi từ cấu trúc Map và Set về cấu trúc mảng lồng nhau mà frontend cần.
    const generatedNav = Array.from(categoryMap.values()).map(category => {
        category.children = Array.from(category.children.values()).map(group => {
            group.children = Array.from(group.children).map(typeName => ({
                id: _.uniqueId('type_'),
                title: typeName,
                path: `/invitations/category/${_.kebabCase(category.originalName)}/${_.kebabCase(group.originalName)}/${_.kebabCase(typeName)}`,
                type: 'type',
                originalName: typeName,
                isVisible: true,
                children: [], // Cấp 3 (Type) không có con.
            }));
            return group;
        });
        return category;
    });

    // Lưu lại cấu trúc vừa tạo để lần sau không cần tạo lại.
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
        { new: true, upsert: true }
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
    updateGroupOrderInCategory,
    addInvitationTaxonomy
};