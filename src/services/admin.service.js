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
    return settings.headerNav || [];
};

/**
 * Cập nhật cấu trúc menu điều hướng (header).
 * @param {Array} navData - Mảng các mục menu mới.
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
    const settings = await getSettings(); // Dùng lại hàm getSettings để đảm bảo có document
    
    // Khởi tạo đối tượng groupOrder nếu chưa có
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

const getTaxonomyTree = async () => {
    const settings = await exports.getSettings(); // Dùng lại hàm getSettings đã có

    if (settings.taxonomyTree && settings.taxonomyTree.length > 0) {
        return settings.taxonomyTree;
    }

    // --- Fallback: Tự động tạo cây nếu chưa tồn tại ---
    console.log("Taxonomy tree not found in settings, generating a new one...");
    const aggregation = await Template.aggregate([
        { $match: { category: { $ne: null }, group: { $ne: null }, type: { $ne: null } } },
        {
            $group: {
                _id: { category: "$category", group: "$group" },
                types: { $addToSet: "$type" }
            }
        },
        {
            $group: {
                _id: "$_id.category",
                groups: {
                    $push: {
                        id: { $concat: ["group_", "$_id.group"] }, // Tạo ID tạm thời
                        name: "$_id.group",
                        children: {
                            $map: {
                                input: "$types",
                                as: "type",
                                in: { id: { $concat: ["type_", "$$type"] }, name: "$$type" }
                            }
                        }
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                id: { $concat: ["cat_", "$_id"] },
                name: "$_id",
                children: "$groups"
            }
        }
    ]);

    return aggregation;
};


/**
 * [HÀM MỚI]
 * Lưu toàn bộ cấu trúc cây và đồng bộ hóa các thay đổi vào collection `invitationtemplates`.
 * @param {Array} newTree - Cấu trúc cây mới từ frontend.
 */
const saveTaxonomyTree = async (newTree) => {
    // Lấy trạng thái cũ để so sánh
    const oldSettings = await Setting.findOne({ singletonKey: "main_settings" }).lean();
    const oldTree = oldSettings.taxonomyTree || [];

    // --- Helper functions để xử lý so sánh ---
    const flattenTree = (tree) => {
        const map = new Map();
        tree.forEach(cat => {
            map.set(cat.id, { ...cat, parentId: null, level: 1 });
            (cat.children || []).forEach(group => {
                map.set(group.id, { ...group, parentId: cat.id, level: 2 });
                (group.children || []).forEach(type => {
                    map.set(type.id, { ...type, parentId: group.id, level: 3 });
                });
            });
        });
        return map;
    };
    
    const oldMap = flattenTree(oldTree);
    const newMap = flattenTree(newTree);

    const operations = []; // Mảng chứa các lệnh bulk write cho MongoDB

    // --- Xử lý các thay đổi (Sửa tên, Xóa) ---
    for (const [id, oldItem] of oldMap.entries()) {
        const newItem = newMap.get(id);

        if (!newItem) {
            // **Item đã bị xóa**
            switch (oldItem.level) {
                case 1: // Category
                    operations.push({ updateMany: { filter: { category: oldItem.name }, update: { $set: { category: "Uncategorized" } } } });
                    break;
                case 2: // Group
                    operations.push({ updateMany: { group: oldItem.name }, update: { $set: { group: "Uncategorized" } } });
                    break;
                case 3: // Type
                    operations.push({ updateMany: { type: oldItem.name }, update: { $set: { type: "Uncategorized" } } });
                    break;
            }
        } else if (newItem.name !== oldItem.name) {
            // **Item đã được đổi tên**
            switch (oldItem.level) {
                case 1:
                    operations.push({ updateMany: { filter: { category: oldItem.name }, update: { $set: { category: newItem.name } } } });
                    break;
                case 2:
                    operations.push({ updateMany: { group: oldItem.name }, update: { $set: { group: newItem.name } } });
                    break;
                case 3:
                    operations.push({ updateMany: { type: oldItem.name }, update: { $set: { type: newItem.name } } });
                    break;
            }
        }
    }
    
    // --- Thực thi các thay đổi trên collection `invitationtemplates` ---
    if (operations.length > 0) {
        await Template.bulkWrite(operations);
    }

    // --- Cuối cùng, lưu lại toàn bộ cấu trúc cây mới vào `settings` ---
    const result = await Setting.findOneAndUpdate(
        { singletonKey: "main_settings" },
        { $set: { taxonomyTree: newTree } },
        { new: true, upsert: true }
    );

    return result.taxonomyTree;
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
    saveTaxonomyTree,
    getTaxonomyTree,
};