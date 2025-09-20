// TrainData/AdminBE/controllers/page.controller.js
const pageService = require('../services/page.service');
const { uploadFileToCloudflare } = require('../services/cloudflare.service');
const sharp = require('sharp');

const processContentImages = async (contentBlocks) => {
    if (!Array.isArray(contentBlocks)) return [];

    const processedBlocks = await Promise.all(contentBlocks.map(async (block) => {
        if (block.type === 'image' && block.content && block.content.startsWith('data:image')) {
            try {
                const base64Data = block.content.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');

                const processedBuffer = await sharp(buffer)
                    .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();
                
                const { url } = await uploadFileToCloudflare(processedBuffer);
                
                return { ...block, content: url };
            } catch (error) {
                console.error("Lỗi xử lý ảnh nội dung:", error);
                return block;
            }
        }
        return block;
    }));

    return processedBlocks;
};

exports.getPublicPages = async (req, res, next) => {
    try {
        const { category } = req.query;
        let pages;
        if (category) {
            pages = await pageService.getBlogsByCategory(category);
        } else {
            pages = await pageService.getPublicPages();
        }
        res.status(200).json({ status: 'success', data: pages });
    } catch (error) {
        next(error);
    }
};


exports.getPages = async (req, res, next) => {
    try {
        const query = {};
        if (req.query.isBlog) query.isBlog = req.query.isBlog === 'true';
        if (req.query.isPublished) query.isPublished = req.query.isPublished === 'true';
        // Thêm query cho category
        if (req.query.category) query.category = req.query.category;
        
        const pages = await pageService.getAllPages(query); 
        
        res.status(200).json({ status: 'success', data: pages });
    } catch (error) { 
        next(error); 
    }
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
        
        const pageData = { ...req.body };
        if (pageData.topics && typeof pageData.topics === 'string') {
            pageData.topics = JSON.parse(pageData.topics);
        }
        const contentBlocks = JSON.parse(pageData.content || '[]');

        const processedContent = await processContentFiles(contentBlocks, req.files);
        pageData.content = processedContent;

        if (pageData.seo && typeof pageData.seo === 'string') {
            pageData.seo = JSON.parse(pageData.seo);
        }
        if (pageData.isBlog) {
            pageData.isBlog = pageData.isBlog === 'true';
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

exports.updatePage = async (req, res, next) => {
    try {
        const pageData = { ...req.body };

        // --- BẮT ĐẦU THÊM LOGIC DỌN DẸP ---
        pageData.isBlog = pageData.isBlog === 'true';

        // 1. Nếu không phải là blog, luôn xóa category
        if (!pageData.isBlog) {
            pageData.category = null;
        } 
        // 2. Nếu là blog nhưng category rỗng, cũng đặt là null
        else if (pageData.category === '') {
            pageData.category = null;
        }
        // --- KẾT THÚC LOGIC DỌN DẸP ---

        if (pageData.topics && typeof pageData.topics === 'string') {
            pageData.topics = JSON.parse(pageData.topics);
        }
        const contentBlocks = JSON.parse(pageData.content || '[]');
        
        const processedContent = await processContentFiles(contentBlocks, req.files);
        pageData.content = processedContent;

        if (pageData.seo && typeof pageData.seo === 'string') {
            pageData.seo = JSON.parse(pageData.seo);
        }

        // Dùng pageData đã được làm sạch để cập nhật
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

exports.getPublicPageBySlug = async (req, res, next) => {
    try {
        const page = await pageService.getPageBySlug(req.params.slug);
        if (!page) return res.status(404).json({ message: 'Trang không tồn tại hoặc chưa được xuất bản.' });
        res.status(200).json({ status: 'success', data: page });
    } catch (error) { next(error); }
};

exports.getAllPageCategories = async (req, res, next) => {
    try {
        const categories = await pageService.getAllPageCategories();
        res.status(200).json({ status: 'success', data: categories });
    } catch (error) {
        next(error);
    }
};

exports.createPageCategory = async (req, res, next) => {
    try {
        const newCategory = await pageService.createPageCategory(req.body);
        res.status(201).json({ status: 'success', data: newCategory });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Lỗi: Tên hoặc đường dẫn (slug) của danh mục đã tồn tại.' });
        }
        next(error);
    }
};

exports.updatePageCategory = async (req, res, next) => {
    try {
        const updatedCategory = await pageService.updatePageCategory(req.params.id, req.body);
        if (!updatedCategory) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        res.status(200).json({ status: 'success', data: updatedCategory });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Lỗi: Tên hoặc đường dẫn (slug) của danh mục đã tồn tại.' });
        }
        next(error);
    }
};

exports.deletePageCategory = async (req, res, next) => {
    try {
        const category = await pageService.deletePageCategory(req.params.id);
        if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

exports.updatePageOrder = async (req, res, next) => {
    try {
        if (!Array.isArray(req.body.pages)) {
            return res.status(400).json({ status: 'fail', message: 'Dữ liệu pages phải là một mảng.' });
        }
        await pageService.updatePageOrder(req.body.pages);
        res.status(200).json({ status: 'success', message: 'Thứ tự trang được cập nhật thành công.' });
    } catch (error) {
        next(error);
    }
};

const processContentFiles = async (contentBlocks, files) => {
    if (!Array.isArray(contentBlocks) || !Array.isArray(files) || files.length === 0) {
        return contentBlocks;
    }

    const fileMap = new Map(files.map(f => [f.originalname, f]));

    const processedBlocks = await Promise.all(contentBlocks.map(async (block) => {
        if (block.type === 'image' && block.content && block.content.startsWith('[[file:')) {
            const fileName = block.content.match(/\[\[file:(.*?)\]\]/)[1];
            const file = fileMap.get(fileName);

            if (file) {
                try {
                    const processedBuffer = await sharp(file.buffer)
                        .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 80 })
                        .toBuffer();
                    
                    const { url } = await uploadFileToCloudflare(processedBuffer);
                    
                    return { ...block, content: url };
                } catch (error) {
                    console.error("Lỗi xử lý ảnh nội dung:", error);
                    return block;
                }
            }
        }
        return block;
    }));

    return processedBlocks;
};