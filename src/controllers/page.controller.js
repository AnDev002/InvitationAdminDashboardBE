// TrainData/AdminBE/controllers/page.controller.js
const pageService = require('../services/page.service');

exports.getPages = async (req, res, next) => {
    try {
        const pages = await pageService.getAllPages();
        res.status(200).json({ status: 'success', data: pages });
    } catch (error) { next(error); }
};

exports.getPage = async (req, res, next) => {
    try {
        const page = await pageService.getPageById(req.params.id);
        if (!page) return res.status(404).json({ message: 'Không tìm thấy trang' });
        res.status(200).json({ status: 'success', data: page });
    } catch (error) { next(error); }
};

exports.createPage = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Xác thực không thành công, không thể xác định tác giả.' });
        }
        const newPage = await pageService.createPage({ ...req.body, author: req.user.id });
        res.status(201).json({ status: 'success', data: newPage });
    } catch (error) {
        // --- THÊM MỚI: Xử lý lỗi trùng lặp slug ---
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Lỗi: Đường dẫn (slug) này đã tồn tại. Vui lòng chọn một đường dẫn khác.' });
        }
        next(error);
    }
};

exports.updatePage = async (req, res, next) => {
    try {
        const updatedPage = await pageService.updatePage(req.params.id, req.body);
        if (!updatedPage) return res.status(404).json({ message: 'Không tìm thấy trang' });
        res.status(200).json({ status: 'success', data: updatedPage });
    } catch (error) { 
        // --- THÊM MỚI: Xử lý lỗi trùng lặp slug khi cập nhật ---
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Lỗi: Đường dẫn (slug) này đã tồn tại. Vui lòng chọn một đường dẫn khác.' });
        }
        next(error); 
    }
};

exports.deletePage = async (req, res, next) => {
    try {
        const page = await pageService.deletePage(req.params.id);
        if (!page) return res.status(404).json({ message: 'Không tìm thấy trang' });
        res.status(204).send();
    } catch (error) { next(error); }
};

// --- Controller cho Public API ---
exports.getPublicPageBySlug = async (req, res, next) => {
    try {
        const page = await pageService.getPageBySlug(req.params.slug);
        if (!page) return res.status(404).json({ message: 'Trang không tồn tại hoặc chưa được xuất bản.' });
        res.status(200).json({ status: 'success', data: page });
    } catch (error) { next(error); }
};