const adminService = require('../services/admin.service');
const _ = require('lodash');
const sharp = require('sharp');
const { uploadFileToR2 } = require('../services/r2.service');

// Dashboard
exports.getDashboardData = async (req, res, next) => {
    try {
        const { startDate, endDate, role, category } = req.query;
        const data = await adminService.getDashboardData({ startDate, endDate, role, category });
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// Settings
exports.getSettings = async (req, res, next) => {
    try {
        const settings = await adminService.getSettings();
        res.status(200).json(settings);
    } catch (error) {
        next(error);
    }
};

exports.updateSettings = async (req, res, next) => {
    try {
        const settingsData = JSON.parse(req.body.settings || '{}');

        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                let fileBuffer = file.buffer;
                let fileMimeType = file.mimetype;

                if (file.mimetype !== 'image/gif') {
                    fileBuffer = await sharp(file.buffer)
                        .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 85 })
                        .toBuffer();
                    fileMimeType = 'image/webp';
                }

                const { url } = await uploadFileToR2(fileBuffer, fileMimeType);
                const path = file.fieldname.replace(/_(\d+)_/g, '[$1].').replace(/_/g, '.');
                _.set(settingsData, path, url);
            });
            await Promise.all(uploadPromises);
        }
        
        const updatedSettings = await adminService.updateSettings(settingsData);
        
        res.status(200).json({
            message: "Cài đặt đã được cập nhật thành công.",
            data: updatedSettings
        });
    } catch (error) {
        next(error);
    }
};

// ++ CONTROLLERS MỚI CHO QUẢN LÝ DANH MỤC VÀ ĐIỀU HƯỚNG ++

exports.getInvitationTaxonomies = async (req, res, next) => {
    try {
        const taxonomies = await adminService.getInvitationTaxonomies();
        res.status(200).json({ status: 'success', data: taxonomies });
    } catch (error) {
        next(error);
    }
};

exports.updateInvitationTaxonomy = async (req, res, next) => {
    try {
        const { taxonomyType, oldName, newName } = req.body;
        if (!['category', 'group', 'type'].includes(taxonomyType) || !oldName || !newName) {
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });
        }
        const result = await adminService.updateInvitationTaxonomy(taxonomyType, oldName, newName);
        res.status(200).json({
            status: 'success',
            message: `Đã cập nhật ${result.modifiedCount} mục.`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteInvitationTaxonomy = async (req, res, next) => {
    try {
        const { taxonomyType, name } = req.body;
        if (!['category', 'group', 'type'].includes(taxonomyType) || !name) {
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });
        }
        const result = await adminService.deleteInvitationTaxonomy(taxonomyType, name);
        res.status(200).json({
            status: 'success',
            message: `Đã cập nhật ${result.modifiedCount} mục.`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

exports.getNavigation = async (req, res, next) => {
    try {
        const navigation = await adminService.getNavigation();
        res.status(200).json({ status: 'success', data: navigation });
    } catch (error) {
        next(error);
    }
};

exports.updateNavigation = async (req, res, next) => {
    try {
        const { navData } = req.body;
        if (!Array.isArray(navData)) {
            return res.status(400).json({ message: 'Dữ liệu điều hướng phải là một mảng.' });
        }
        const updatedNavigation = await adminService.updateNavigation(navData);
        res.status(200).json({
            status: 'success',
            message: 'Điều hướng đã được cập nhật thành công.',
            data: updatedNavigation
        });
    } catch (error) {
        next(error);
    }
};

exports.updateGroupOrder = async (req, res, next) => {
    try {
        const { categoryName, orderedGroups } = req.body;
        if (!categoryName || !Array.isArray(orderedGroups)) {
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });
        }

        const result = await adminService.updateGroupOrderInCategory(categoryName, orderedGroups);
        
        res.status(200).json({
            status: 'success',
            message: `Đã cập nhật thứ tự nhóm cho danh mục "${categoryName}".`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
exports.getTaxonomyTree = async (req, res, next) => {
    try {
        const tree = await adminService.getTaxonomyTree();
        res.status(200).json({ status: 'success', data: tree });
    } catch (error) {
        next(error);
    }
};

exports.saveTaxonomyTree = async (req, res, next) => {
    try {
        const { tree } = req.body;
        if (!Array.isArray(tree)) {
            return res.status(400).json({ message: 'Dữ liệu cây không hợp lệ.' });
        }
        const updatedTree = await adminService.saveTaxonomyTree(tree);
        res.status(200).json({
            status: 'success',
            message: 'Cấu trúc danh mục đã được lưu thành công.',
            data: updatedTree
        });
    } catch (error) {
        next(error);
    }
};