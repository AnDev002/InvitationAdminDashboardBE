// TrainData/AdminBE/controllers/page.controller.js
const pageService = require('../services/page.service');
const { uploadFileToCloudflare } = require('../services/cloudflare.service');
const sharp = require('sharp');

// --- Helper: Xử lý Thumbnail riêng biệt ---
const processThumbnail = async (files) => {
    if (!files || files.length === 0) return null;
    
    // Tìm file có fieldname là 'thumbnail'
    const thumbFile = files.find(f => f.fieldname === 'thumbnail');
    if (!thumbFile) return null;

    try {
        const buffer = await sharp(thumbFile.buffer)
            .resize({ width: 800, height: 500, fit: 'cover' }) // Resize chuẩn Card
            .webp({ quality: 80 })
            .toBuffer();
        
        const { url } = await uploadFileToCloudflare(buffer);
        return url;
    } catch (error) {
        console.error("Lỗi xử lý Thumbnail:", error);
        return null;
    }
};

// --- Helper: Xử lý ảnh trong nội dung bài viết (giữ nguyên của bạn) ---
const processContentFiles = async (contentBlocks, files) => {
    if (!Array.isArray(contentBlocks) || !Array.isArray(files) || files.length === 0) {
        return contentBlocks;
    }

    const fileMap = new Map(files.map(f => [f.originalname, f]));

    const processedBlocks = await Promise.all(contentBlocks.map(async (block) => {
        if (block.type === 'image' && block.content && block.content.startsWith('[[file:')) {
            try {
                const match = block.content.match(/\[\[file:(.*?)\]\]/);
                if (!match) return block;
                
                const fileName = match[1];
                const file = fileMap.get(fileName);

                if (file) {
                    const processedBuffer = await sharp(file.buffer)
                        .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 80 })
                        .toBuffer();
                    
                    const { url } = await uploadFileToCloudflare(processedBuffer);
                    return { ...block, content: url };
                }
            } catch (error) {
                console.error("Lỗi xử lý ảnh nội dung:", error);
                return block;
            }
        }
        return block;
    }));

    return processedBlocks;
};

// --- Controllers ---

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
        const pageData = { ...req.body };
        
        // 1. Xử lý Thumbnail (New Logic)
        const thumbnailUrl = await processThumbnail(req.files);
        if (thumbnailUrl) {
            pageData.thumbnail = thumbnailUrl;
        }

        // 2. Parse dữ liệu JSON
        if (pageData.topics && typeof pageData.topics === 'string') {
            pageData.topics = JSON.parse(pageData.topics);
        }
        const contentBlocks = JSON.parse(pageData.content || '[]');

        // 3. Xử lý ảnh trong nội dung
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
            return res.status(409).json({ message: 'Lỗi: Đường dẫn (slug) này đã tồn tại.' });
        }
        next(error);
    }
};

exports.updatePage = async (req, res, next) => {
    try {
        const pageData = { ...req.body };

        // 1. Xử lý Thumbnail khi update (New Logic)
        // Nếu có file mới upload -> process và lấy URL mới
        const newThumbnailUrl = await processThumbnail(req.files);
        if (newThumbnailUrl) {
            pageData.thumbnail = newThumbnailUrl;
        } else if (pageData.thumbnailUrl) {
            // Nếu không có file mới, nhưng Frontend gửi 'thumbnailUrl' cũ -> giữ nguyên
            pageData.thumbnail = pageData.thumbnailUrl;
        }
        // Xóa trường thừa để tránh lỗi schema nếu có
        delete pageData.thumbnailUrl;

        // 2. Logic dọn dẹp Category
        pageData.isBlog = pageData.isBlog === 'true';
        if (!pageData.isBlog) {
            pageData.category = null;
        } else if (pageData.category === '' || pageData.category === 'null') {
            pageData.category = null;
        }

        // 3. Parse và xử lý nội dung
        if (pageData.topics && typeof pageData.topics === 'string') {
            pageData.topics = JSON.parse(pageData.topics);
        }
        
        const contentBlocks = JSON.parse(pageData.content || '[]');
        const processedContent = await processContentFiles(contentBlocks, req.files);
        pageData.content = processedContent;

        if (pageData.seo && typeof pageData.seo === 'string') {
            pageData.seo = JSON.parse(pageData.seo);
        }

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
            return res.status(409).json({ message: 'Lỗi: Tên hoặc slug danh mục đã tồn tại.' });
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
            return res.status(409).json({ message: 'Lỗi: Tên hoặc slug danh mục đã tồn tại.' });
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