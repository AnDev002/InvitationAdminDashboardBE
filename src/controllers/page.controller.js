// TrainData/AdminBE/controllers/page.controller.js
const pageService = require('../services/page.service');
// ++ THÊM MỚI: Import các service cần thiết
const { uploadFileToR2 } = require('../services/r2.service');
const sharp = require('sharp');

// ++ MỚI: Hàm trợ giúp để xử lý upload ảnh trong nội dung
const processContentImages = async (contentBlocks) => {
    if (!Array.isArray(contentBlocks)) return [];

    const processedBlocks = await Promise.all(contentBlocks.map(async (block) => {
        // Chỉ xử lý các khối hình ảnh có nội dung base64
        if (block.type === 'image' && block.content && block.content.startsWith('data:image')) {
            try {
                // Chuyển đổi base64 thành buffer
                const base64Data = block.content.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');

                // Tối ưu hóa ảnh với sharp
                const processedBuffer = await sharp(buffer)
                    .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();
                
                // Tải lên R2
                const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
                
                // Trả về khối đã được cập nhật với URL mới
                return { ...block, content: url };
            } catch (error) {
                console.error("Lỗi xử lý ảnh nội dung:", error);
                // Nếu có lỗi, trả về khối gốc để không làm gián đoạn quá trình lưu
                return block;
            }
        }
        // Trả về các khối khác không thay đổi
        return block;
    }));

    return processedBlocks;
};


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

// ++ THAY ĐỔI: Cập nhật hàm createPage
exports.createPage = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Xác thực không thành công, không thể xác định tác giả.' });
        }
        
        const pageData = { ...req.body };
        // Xử lý upload ảnh cho các khối nội dung
        if (pageData.content && Array.isArray(pageData.content)) {
            pageData.content = await processContentImages(pageData.content);
        }

        const newPage = await pageService.createPage({ ...pageData, author: req.user.id });
        res.status(201).json({ status: 'success', data: newPage });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Lỗi: Đường dẫn (slug) này đã tồn tại. Vui lòng chọn một đường dẫn khác.' });
        }
        next(error);
    }
};

// ++ THAY ĐỔI: Cập nhật hàm updatePage
exports.updatePage = async (req, res, next) => {
    try {
        const pageData = { ...req.body };
        // Xử lý upload ảnh cho các khối nội dung
        if (pageData.content && Array.isArray(pageData.content)) {
            pageData.content = await processContentImages(pageData.content);
        }

        const updatedPage = await pageService.updatePage(req.params.id, pageData);
        if (!updatedPage) return res.status(404).json({ message: 'Không tìm thấy trang' });
        res.status(200).json({ status: 'success', data: updatedPage });
    } catch (error) { 
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

// --- Controller cho Public API (Không thay đổi) ---
exports.getPublicPageBySlug = async (req, res, next) => {
    try {
        const page = await pageService.getPageBySlug(req.params.slug);
        if (!page) return res.status(404).json({ message: 'Trang không tồn tại hoặc chưa được xuất bản.' });
        res.status(200).json({ status: 'success', data: page });
    } catch (error) { next(error); }
};