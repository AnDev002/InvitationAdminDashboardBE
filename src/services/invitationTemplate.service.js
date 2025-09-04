// AdminBE/services/invitationTemplate.service.js
const InvitationTemplate = require('../models/invitationTemplate.model');
const { uploadFileToR2 } = require('./r2.service'); 
const sharp = require('sharp');
const axios = require('axios');

async function renderPageToBuffer(page) {
    if (!page) return null;

    // 1. Tạo canvas nền với màu sắc
    let canvas = sharp({
        create: {
            width: page.canvasWidth,
            height: page.canvasHeight,
            channels: 4,
            background: page.backgroundColor || '#FFFFFF'
        }
    });

    // 2. Thêm ảnh nền của trang (nếu có)
    if (page.backgroundImage) {
        try {
            const bgResponse = await axios.get(page.backgroundImage, { responseType: 'arraybuffer' });
            canvas = sharp(await canvas.toBuffer()).composite([{ input: Buffer.from(bgResponse.data) }]);
        } catch (e) { console.error("Thumbnail Gen Error: Cannot fetch page background.", e); }
    }

    // 3. Sắp xếp và render các đối tượng (text, image)
    const compositeOperations = [];
    const sortedItems = [...(page.items || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const item of sortedItems) {
        if (!item.visible) continue;

        let itemBuffer;
        if (item.type === 'image' && item.url) {
            try {
                const itemImgRes = await axios.get(item.url, { responseType: 'arraybuffer' });
                itemBuffer = await sharp(Buffer.from(itemImgRes.data))
                    .resize(Math.round(item.width), Math.round(item.height))
                    .toBuffer();
            } catch (e) { console.error(`Thumbnail Gen Error: Cannot fetch item image ${item.url}`, e); continue; }
        } else if (item.type === 'text' && item.content) {
            // Sử dụng SVG để render text, hỗ trợ cơ bản cho font và style
            const svgText = `
                <svg width="${item.width}" height="${item.height}">
                    <style>
                        .text { 
                            font-family: "${item.fontFamily || 'Arial'}";
                            font-size: ${item.fontSize || 16}px; 
                            fill: ${item.color || '#000'};
                            font-weight: ${item.fontWeight || 'normal'};
                            font-style: ${item.fontStyle || 'normal'};
                            text-decoration: ${item.textDecoration || 'none'};
                        }
                    </style>
                    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="text">${item.content}</text>
                </svg>
            `;
            itemBuffer = Buffer.from(svgText);
        }

        if (itemBuffer) {
            compositeOperations.push({
                input: itemBuffer,
                left: Math.round(item.x),
                top: Math.round(item.y),
                blend: 'over'
            });
        }
    }

    return sharp(await canvas.toBuffer()).composite(compositeOperations).webp({ quality: 80 }).toBuffer();
}



function escapeXml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

async function renderPageToBuffer(page) {
    if (!page) return null;

    // 1. Tạo canvas nền với màu sắc
    let canvas = sharp({
        create: {
            width: page.canvasWidth,
            height: page.canvasHeight,
            channels: 4,
            background: page.backgroundColor || '#FFFFFF'
        }
    });

    // 2. Thêm ảnh nền của trang (nếu có)
    if (page.backgroundImage) {
        try {
            const bgResponse = await axios.get(page.backgroundImage, { responseType: 'arraybuffer' });
            const bgBuffer = Buffer.from(bgResponse.data);
            // Kiểm tra xem buffer có hợp lệ không trước khi ghép
            if (bgBuffer.length > 0) {
                 canvas = sharp(await canvas.toBuffer()).composite([{ input: bgBuffer }]);
            }
        } catch (e) { console.error("Thumbnail Gen Error: Cannot fetch page background.", e); }
    }

    // 3. Sắp xếp và render các đối tượng (text, image)
    const compositeOperations = [];
    const sortedItems = [...(page.items || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const item of sortedItems) {
        if (!item.visible) continue;

        let itemBuffer;
        if (item.type === 'image' && item.url) {
            try {
                const itemImgRes = await axios.get(item.url, { responseType: 'arraybuffer' });
                itemBuffer = await sharp(Buffer.from(itemImgRes.data))
                    .resize(Math.round(item.width), Math.round(item.height))
                    .toBuffer();
            } catch (e) { console.error(`Thumbnail Gen Error: Cannot fetch item image ${item.url}`, e); continue; }
        } else if (item.type === 'text' && item.content) {
            // Sử dụng SVG để render text
            const svgText = `
                <svg width="${item.width}" height="${item.height}">
                    <style>
                        .text { 
                            font-family: "${item.fontFamily || 'Arial'}";
                            font-size: ${item.fontSize || 16}px; 
                            fill: ${item.color || '#000'};
                            font-weight: ${item.fontWeight || 'normal'};
                            font-style: ${item.fontStyle || 'normal'};
                            text-decoration: ${item.textDecoration || 'none'};
                        }
                    </style>
                    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="text">${escapeXml(item.content)}</text>
                </svg>
            `; // <--- SỬA LỖI Ở ĐÂY
            itemBuffer = Buffer.from(svgText);
        }

        if (itemBuffer) {
            compositeOperations.push({
                input: itemBuffer,
                left: Math.round(item.x),
                top: Math.round(item.y),
                blend: 'over'
            });
        }
    }

    return sharp(await canvas.toBuffer()).composite(compositeOperations).webp({ quality: 80 }).toBuffer();
}

// Hàm chính để tạo thumbnail tự động
async function generateAutomaticThumbnail(pages, backgroundUrl) {
    if (!pages || pages.length === 0) return null;

    if (pages.length === 1) {
        // Trường hợp chỉ có 1 trang
        return await renderPageToBuffer(pages[0]);
    } else {
        // Trường hợp có 2 trang trở lên
        const page1Buffer = await renderPageToBuffer(pages[0]);
        const page2Buffer = await renderPageToBuffer(pages[1]);
        if (!page1Buffer || !page2Buffer) return null;

        const page1Meta = await sharp(page1Buffer).metadata();
        const W = page1Meta.width;
        const H = page1Meta.height;
        
        const offsetX = Math.round(W * 0.08);
        const offsetY = Math.round(H * 0.12);

        const containerWidth = W + offsetX;
        const containerHeight = H + offsetY;

        const resizedPage2Buffer = await sharp(page2Buffer).resize(W, H).toBuffer();

        let finalCanvas;
        if (backgroundUrl) {
            try {
                const bgRes = await axios.get(backgroundUrl, { responseType: 'arraybuffer' });
                finalCanvas = sharp(Buffer.from(bgRes.data)).resize(containerWidth, containerHeight);
            } catch (e) { 
                console.error("Thumbnail Gen Error: Cannot fetch background.", e);
                finalCanvas = sharp({ create: { width: containerWidth, height: containerHeight, channels: 4, background: '#F9FAFB' } });
            }
        } else {
            finalCanvas = sharp({ create: { width: containerWidth, height: containerHeight, channels: 4, background: '#F9FAFB' } });
        }
        
        const compositeOps = [
            { input: resizedPage2Buffer, top: 0, left: 0 },
            { input: page1Buffer, top: offsetY, left: offsetX }
        ];

        return finalCanvas.composite(compositeOps).webp({ quality: 85 }).toBuffer();
    }
}
const queryInvitationTemplates = (filter) => {
  return InvitationTemplate.find({ ...filter }).sort({ displayOrder: 1, createdAt: -1 });
};

const getTemplateById = async (id) => {
  return await InvitationTemplate.findById(id);
};

const createTemplate = async (templateData) => {
  return await InvitationTemplate.create(templateData);
};

const updateTemplateById = async (id, updateData, files = []) => {
    const template = await InvitationTemplate.findById(id);
    if (!template) {
        throw new Error('Không tìm thấy mẫu thiệp để cập nhật.');
    }

    // Gán các trường dữ liệu đơn giản
    Object.assign(template, {
        title: updateData.title,
        category: updateData.category,
        group: updateData.group,
        type: updateData.type,
        description: updateData.description,
        isActive: updateData.isActive,
        loveGiftsButton: updateData.loveGiftsButton,
    });
    
    const templateDataObject = updateData.templateData;
    const fileUrlMap = new Map();

    // 1. Tải TẤT CẢ các file lên R2 song song và tạo một map tra cứu
    const uploadPromises = files.map(async (file) => {
        const processedBuffer = await sharp(file.buffer)
            .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
        const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
        fileUrlMap.set(file.fieldname, url); // Dùng fieldname làm key
    });
    await Promise.all(uploadPromises);

    // 2. Cập nhật các URL đã tải lên vào đúng vị trí trong templateData
    
    // 2a. Cập nhật ảnh nền cho thumbnail
    if (fileUrlMap.has('thumbnailBackground')) {
        template.thumbnailBackgroundSrc = fileUrlMap.get('thumbnailBackground');
    } else if (updateData.thumbnailBackgroundSrc === '') {
        template.thumbnailBackgroundSrc = '';
    }

    // 2b. Cập nhật ảnh nền cho các trang và các ảnh item bên trong canvas
    if (templateDataObject.pages && Array.isArray(templateDataObject.pages)) {
        templateDataObject.pages.forEach(page => {
            // Xử lý ảnh nền của trang
            const bgFieldname = `background_${page.id}`;
            if (fileUrlMap.has(bgFieldname)) {
                page.backgroundImage = fileUrlMap.get(bgFieldname);
            }

            // Xử lý ảnh item
            if (page.items && Array.isArray(page.items)) {
                page.items.forEach(item => {
                    if (item.type === 'image' && typeof item.url === 'string' && item.url.startsWith('__FILE_PLACEHOLDER_')) {
                        const placeholder = item.url.replace('__FILE_PLACEHOLDER_', '');
                        if (fileUrlMap.has(placeholder)) {
                            item.url = fileUrlMap.get(placeholder);
                        }
                    }
                });
            }
        });
    }

    // 3. Gán templateData đã được "làm sạch" vào document
    template.templateData = templateDataObject;
    
    // 4. TẠO THUMBNAIL TỰ ĐỘNG (Bây giờ đã có đủ URL hợp lệ)
    if (template.templateData && template.templateData.pages && template.templateData.pages.length > 0) {
        const thumbnailBuffer = await generateAutomaticThumbnail(template.templateData.pages, template.thumbnailBackgroundSrc);
        if (thumbnailBuffer) {
            const { url: newThumbnailUrl } = await uploadFileToR2(thumbnailBuffer, 'image/webp');
            template.imgSrc = newThumbnailUrl;
        }
    }
    
    template.markModified('templateData');
    await template.save();
    return template;
};



const deleteTemplateById = async (id) => {
  await InvitationTemplate.findByIdAndDelete(id);
};

const getUniqueCategories = async () => {
  return await InvitationTemplate.distinct('category');
};

const getUniqueTypesForCategory = async (category) => {
  return await InvitationTemplate.distinct('type', { category: category });
};

const getUniqueGroups = async () => {
  return await InvitationTemplate.distinct('group').where('group').ne(null).ne('');
};

const getUniqueGroupsForCategory = async (category) => {
  return await InvitationTemplate.distinct('group', { category: category }).where('group').ne(null).ne('');
};

const getUniqueTypesForCategoryAndGroup = async (category, group) => {
  return await InvitationTemplate.distinct('type', { category: category, group: group }).where('type').ne(null).ne('');
};

// --- HÀM ĐÃ ĐƯỢC CẬP NHẬT ---
const bulkCreateTemplates = async (templatesToCreate) => {
    if (!templatesToCreate || templatesToCreate.length === 0) {
        return [];
    }

    const incomingTitles = templatesToCreate.map(t => t.title);
    const incomingSlugs = templatesToCreate.map(t => t.slug);

    // 1. Kiểm tra trùng lặp BÊN TRONG file upload (cho cả title và slug)
    const titlesInFile = new Set();
    const slugsInFile = new Set();
    const duplicatesInFile = new Set();

    for (const template of templatesToCreate) {
        if (titlesInFile.has(template.title)) {
            duplicatesInFile.add(template.title);
        } else {
            titlesInFile.add(template.title);
        }
        if (slugsInFile.has(template.slug)) {
            // Báo lỗi theo title để người dùng dễ hiểu hơn
            duplicatesInFile.add(template.title);
        } else {
            slugsInFile.add(template.slug);
        }
    }

    // 2. Kiểm tra xem titles hoặc slugs đã tồn tại trong DB chưa
    const existingTemplates = await InvitationTemplate.find({
        $or: [
            { title: { $in: incomingTitles } },
            { slug: { $in: incomingSlugs } }
        ]
    }).select('title'); // Chỉ cần lấy title để báo lỗi

    const existingTitlesInDb = new Set(existingTemplates.map(t => t.title));

    // 3. Gộp tất cả các tiêu đề bị trùng lặp
    const allDuplicateTitles = [...new Set([...duplicatesInFile, ...existingTitlesInDb])];

    // 4. Nếu có tiêu đề/slug trùng lặp, ném lỗi với thông tin chi tiết
    if (allDuplicateTitles.length > 0) {
        const error = new Error(`Phát hiện ${allDuplicateTitles.length} tiêu đề hoặc slug đã tồn tại/bị trùng lặp.`);
        error.name = 'DuplicateTitlesError';
        error.duplicates = allDuplicateTitles;
        throw error;
    }
    
    // 5. Nếu không có lỗi, tiến hành insert
    return await InvitationTemplate.insertMany(templatesToCreate, { ordered: false });
};

// --- KẾT THÚC CẬP NHẬT ---

const incrementTemplateView = async (templateId) => {
  return await InvitationTemplate.findByIdAndUpdate(templateId, { $inc: { views: 1 } });
};

const reorderTemplates = async (templateIds) => {
    const bulkOps = templateIds.map((id, index) => ({
        updateOne: {
            filter: { _id: id },
            update: { $set: { displayOrder: index + 1 } },
        },
    }));
    return await InvitationTemplate.bulkWrite(bulkOps);
};

// --- HÀM MỚI ĐỂ XÓA HÀNG LOẠT ---
const bulkDeleteTemplatesByFilter = async (filter) => {
    if (!filter || Object.keys(filter).length === 0) {
        throw new Error('Cần có bộ lọc để xóa hàng loạt.');
    }
    // Lọc ra các giá trị null hoặc 'all' để tạo query Mongoose
    const query = Object.entries(filter).reduce((acc, [key, value]) => {
        if (value && value !== 'all') {
            acc[key] = value;
        }
        return acc;
    }, {});

    if (Object.keys(query).length === 0) {
        throw new Error('Bộ lọc không hợp lệ để thực hiện xóa.');
    }

    const result = await InvitationTemplate.deleteMany(query);
    return result;
};
// --- KẾT THÚC HÀM MỚI ---

module.exports = {
  queryInvitationTemplates,
  getTemplateById,
  createTemplate,
  updateTemplateById,
  deleteTemplateById,
  getUniqueCategories,
  getUniqueTypesForCategory,
  bulkCreateTemplates,
  incrementTemplateView,
  getUniqueGroups: async () => await InvitationTemplate.distinct('group').where('group').ne(null).ne(''),
  getUniqueGroupsForCategory,
  getUniqueTypesForCategoryAndGroup,
  reorderTemplates,
  bulkDeleteTemplatesByFilter,
};