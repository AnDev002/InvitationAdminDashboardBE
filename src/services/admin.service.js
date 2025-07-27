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
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
        .limit(5)
        .sort({ stock: 1 });

    return {
        stats: { totalProducts, totalTemplates, totalUsers, newOrders },
        lowStockProducts
    };
};

const getSettings = async () => {
    let settings = await Setting.findOne({ singletonKey: "main_settings" });
    if (!settings) {
        settings = await Setting.create({ singletonKey: "main_settings" });
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