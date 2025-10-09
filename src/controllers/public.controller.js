const adminService = require('../services/admin.service');
const pageCategoryService = require('../services/pageCategory.service');
const topicService = require('../services/topic.service');
const { Setting } = require('../models/settings.model');

// Controller để lấy cài đặt công khai
exports.getPublicSettings = async (req, res, next) => {
    try {
        const settings = await adminService.getSettings();
        // Lọc bớt các thông tin không cần thiết trước khi gửi ra ngoài
        const publicSettings = {
            headerNav: settings.headerNav,
            theme: settings.theme,
            footer: settings.footer,
            banners: settings.banners
        };
        res.status(200).json({
            status: 'success',
            data: publicSettings
        });
    } catch (error) {
        next(error);
    }
};

exports.getPublicPageCategories = async (req, res, next) => {
    try {
        const categories = await pageCategoryService.getAllCategories();
        res.status(200).json({
            status: 'success',
            data: categories
        });
    } catch (error) {
        next(error);
    }
};

exports.getPublicTopics = async (req, res, next) => {
    try {
        const topics = await topicService.getAllTopics();
        res.status(200).json({ status: 'success', data: topics });
    } catch (error) {
        next(error);
    }
};
exports.getPreFooterForPath = async (req, res) => {
    const { path, type: pageType } = req.query;

    if (!path) {
        return res.status(400).send({ message: "Path is required." });
    }

    try {
        const settings = await Setting.findOne({ singletonKey: "main_settings" });

        if (!settings) {
            // Trường hợp không tìm thấy settings, trả về rỗng
            return res.send({ content: '' });
        }

        const activeRules = settings.preFooterRules?.filter(rule => rule.isEnabled) || [];

        // Lọc ra các rule phù hợp
        const matchedRules = activeRules.filter(rule => {
            const urlMatch = rule.displayConditions.specificUrls?.includes(path);
            const typeMatch = rule.displayConditions.pageTypes?.includes(pageType);
            return urlMatch || typeMatch;
        });

        if (matchedRules.length > 0) {
            // Sắp xếp theo độ ưu tiên (cao hơn trước) và lấy rule đầu tiên
            matchedRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
            res.send({ content: matchedRules[0].content });
        } else {
            // Nếu không có rule nào khớp, trả về nội dung mặc định
            res.send({ content: settings.footer?.defaultPreFooterContent || '' });
        }
    } catch (error) {
        console.error('Error fetching pre-footer content:', error);
        res.status(500).send({ message: "Internal server error while fetching pre-footer." });
    }
};