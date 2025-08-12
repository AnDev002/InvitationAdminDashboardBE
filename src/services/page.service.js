// TrainData/AdminBE/controllers/page.controller.js
const pageService = require('../services/page.service');

// Controller giờ đây đơn giản hơn, chỉ cần nhận và lưu dữ liệu.
// Việc xử lý upload ảnh sẽ được thực hiện bởi CKEditor và một route riêng nếu cần.

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
            return res.status(401).json({ message: 'Xác thực không thành công.' });
        }
        
        // Dữ liệu giờ là một object JSON đơn giản
        const pageData = { ...req.body, author: req.user.id };

        const newPage = await pageService.createPage(pageData);
        res.status(201).json({ status: 'success', data: newPage });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Lỗi: Đường dẫn (slug) này đã tồn tại.' });
        }
        next(error);
    }
};

exports.updatePage = async (req, res, next) => {
    try {
        const pageData = { ...req.body };
        
        const updatedPage = await pageService.updatePage(req.params.id, pageData);
        if (!updatedPage) return res.status(404).json({ message: 'Không tìm thấy trang' });
        res.status(200).json({ status: 'success', data: updatedPage });
    } catch (error) { 
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Lỗi: Đường dẫn (slug) này đã tồn tại.' });
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