// AdminBE/services/invitationTemplate.service.js
const InvitationTemplate = require('../models/invitationTemplate.model');
const { uploadFileToR2 } = require('./r2.service'); 
const sharp = require('sharp');
const axios = require('axios');

// ++ BẮT ĐẦU THÊM MỚI: CÁC HÀM HỖ TRỢ TẠO THUMBNAIL ++

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

function sanitizeCssValue(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/["';]/g, '');
}

/**
 * Render một trang canvas thành buffer ảnh.
 * Hàm này xử lý cả ảnh nền, các đối tượng ảnh và text.
 * @param {object} page - Dữ liệu của một trang trong template.
 * @returns {Promise<Buffer|null>} Buffer ảnh WebP hoặc null nếu có lỗi.
 */
async function renderPageToBuffer(page) {
    if (!page || !page.canvasWidth || !page.canvasHeight || page.canvasWidth <= 0 || page.canvasHeight <= 0) {
        console.error("Lỗi tạo Thumbnail: Dữ liệu trang hoặc kích thước canvas không hợp lệ.", { pageId: page?.id });
        return null;
    }

    try {
        const baseCanvas = sharp({
            create: {
                width: page.canvasWidth,
                height: page.canvasHeight,
                channels: 4,
                background: page.backgroundColor || '#FFFFFF'
            }
        });

        let canvasBuffer;

        if (page.backgroundImage && typeof page.backgroundImage === 'string' && page.backgroundImage.startsWith('http')) {
            try {
                const bgResponse = await axios.get(page.backgroundImage, { responseType: 'arraybuffer', timeout: 7000 });
                await sharp(bgResponse.data).metadata(); 
                const resizedBgBuffer = await sharp(bgResponse.data)
                    .resize(page.canvasWidth, page.canvasHeight, { fit: 'cover' })
                    .toBuffer();
                canvasBuffer = await baseCanvas.composite([{ input: resizedBgBuffer }]).toBuffer();
            } catch (e) {
                console.error(`Lỗi tạo Thumbnail: Không thể tải hoặc xử lý ảnh nền: ${page.backgroundImage}. Lý do: ${e.message}`);
                canvasBuffer = await baseCanvas.toBuffer();
            }
        } else {
            canvasBuffer = await baseCanvas.toBuffer();
        }

        const compositeOperations = [];
        const sortedItems = Array.isArray(page.items) ? [...page.items].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)) : [];

        for (const item of sortedItems) {
            if (item.visible === false) continue;
            let itemBuffer;
            try {
                if (item.type === 'image' && item.url && typeof item.url === 'string' && item.url.startsWith('http')) {
                    const itemImgRes = await axios.get(item.url, { responseType: 'arraybuffer', timeout: 7000 });
                    await sharp(itemImgRes.data).metadata();
                    itemBuffer = await sharp(itemImgRes.data)
                        .resize(Math.round(item.width), Math.round(item.height))
                        .toBuffer();
                }
                else if (item.type === 'text' && item.content) {
                    const svgWidth = Math.max(1, Math.round(item.width || 100));
                    const svgHeight = Math.max(1, Math.round(item.height || 50));
                    const fontSize = Math.max(1, item.fontSize || 16);
                    
                    const fontFamily = sanitizeCssValue(item.fontFamily || 'Arial');
                    const color = sanitizeCssValue(item.color || '#000');
                    const fontWeight = sanitizeCssValue(item.fontWeight || 'normal');
                    const fontStyle = sanitizeCssValue(item.fontStyle || 'normal');
                    const textDecoration = sanitizeCssValue(item.textDecoration || 'none');

                    const svgText = `
                        <svg width="${svgWidth}" height="${svgHeight}">
                            <style> .text { font-family: "${fontFamily}"; font-size: ${fontSize}px; fill: ${color}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration}; white-space: pre-wrap; } </style>
                            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="text">${escapeXml(item.content)}</text>
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
            } catch (e) {
                console.error(`Lỗi tạo Thumbnail: Bỏ qua đối tượng không hợp lệ. Lý do: ${e.message}`, { pageId: page.id, itemId: item.id });
                continue;
            }
        }
        
        return await sharp(canvasBuffer).composite(compositeOperations).webp({ quality: 80 }).toBuffer();
    } catch (error) {
        console.error(`Lỗi nghiêm trọng khi render trang: ${error.message}`, { pageId: page?.id });
        return null;
    }
}


/**
 * Tạo ảnh thumbnail tự động từ các trang của thiệp.
 * @param {Array} pages - Mảng các trang trong template.
 * @param {string|null} backgroundUrl - URL của ảnh nền (tùy chọn).
 * @returns {Promise<Buffer|null>} Buffer ảnh thumbnail hoặc null nếu lỗi.
 */
async function generateAutomaticThumbnail(pages, backgroundUrl) {
    if (!pages || pages.length === 0) return null;

    try {
        if (pages.length === 1) {
            // Trường hợp chỉ có 1 trang: render trang đó
            return await renderPageToBuffer(pages[0]);
        } else {
            // Trường hợp có 2 trang trở lên: tạo bố cục ghép ảnh
            const page1Buffer = await renderPageToBuffer(pages[0]);
            const page2Buffer = await renderPageToBuffer(pages[1]);
            
            if (!page1Buffer || !page2Buffer) {
                console.error("Lỗi tạo Thumbnail: Một trong các trang không thể render, hủy tạo thumbnail.");
                return null;
            }

            const page1Meta = await sharp(page1Buffer).metadata();
            const W = page1Meta.width;
            const H = page1Meta.height;
            
            // Tính toán độ lệch để tạo hiệu ứng xếp chồng
            const offsetX = Math.round(W * 0.08);
            const offsetY = Math.round(H * 0.12);

            const containerWidth = W + offsetX;
            const containerHeight = H + offsetY;

            const resizedPage2Buffer = await sharp(page2Buffer).resize(W, H).toBuffer();

            let finalCanvas;
            if (backgroundUrl) {
                try {
                    const bgRes = await axios.get(backgroundUrl, { responseType: 'arraybuffer' });
                    finalCanvas = sharp(bgRes.data).resize(containerWidth, containerHeight);
                } catch (e) { 
                    console.error("Lỗi tạo Thumbnail: Không thể tải ảnh nền.", e);
                    finalCanvas = sharp({ create: { width: containerWidth, height: containerHeight, channels: 4, background: '#F9FAFB' } });
                }
            } else {
                finalCanvas = sharp({ create: { width: containerWidth, height: containerHeight, channels: 4, background: '#F9FAFB' } });
            }
            
            // Ghép ảnh: trang 2 ở sau, trang 1 ở trước và lệch đi một chút
            const compositeOps = [
                { input: resizedPage2Buffer, top: 0, left: 0 },
                { input: page1Buffer, top: offsetY, left: offsetX }
            ];

            return await finalCanvas.composite(compositeOps).webp({ quality: 85 }).toBuffer();
        }
    } catch (error) {
        console.error(`Lỗi nghiêm trọng khi ghép thumbnail: ${error.message}`);
        return null;
    }
}
// ++ KẾT THÚC THÊM MỚI ++

const queryInvitationTemplates = (filter) => {
  return InvitationTemplate.find({ ...filter }).sort({ displayOrder: 1, createdAt: -1 });
};

const getTemplateById = async (id) => {
  return await InvitationTemplate.findById(id);
};

const createTemplate = async (templateData) => {
  return await InvitationTemplate.create(templateData);
};

// ++ BẮT ĐẦU THAY THẾ HÀM updateTemplateById ++
const updateTemplateById = async (id, updateData, files = []) => {
    const template = await InvitationTemplate.findById(id);
    if (!template) {
        throw new Error('Không tìm thấy mẫu thiệp để cập nhật.');
    }

    // Cập nhật các trường thông tin cơ bản
    Object.assign(template, {
        title: updateData.title,
        category: updateData.category,
        group: updateData.group,
        type: updateData.type,
        description: updateData.description,
        isActive: updateData.isActive,
        loveGiftsButton: updateData.loveGiftsButton,
    });
    
    // Parse dữ liệu thiết kế từ form
    const templateDataObject = updateData.templateData;
    
    // Xử lý các file ảnh nền của từng trang
    if (files && files.length > 0) {
        const pageBgFiles = files.filter(f => f.fieldname.startsWith('background_'));
        await Promise.all(pageBgFiles.map(async (file) => {
            const processedBuffer = await sharp(file.buffer).webp({ quality: 85 }).toBuffer();
            const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
            const pageId = file.fieldname.split('_')[1];
            const pageIndex = templateDataObject.pages.findIndex(p => p.id === pageId);
            if (pageIndex !== -1) {
                templateDataObject.pages[pageIndex].backgroundImage = url;
            }
        }));
    }
    
    template.templateData = templateDataObject;

    // Xử lý ảnh nền cho THUMBNAIL
    const thumbnailBgFile = files.find(f => f.fieldname === 'thumbnailBackground');
    if (thumbnailBgFile) {
        const processedBgBuffer = await sharp(thumbnailBgFile.buffer).webp({ quality: 80 }).toBuffer();
        const { url } = await uploadFileToR2(processedBgBuffer, 'image/webp');
        template.thumbnailBackgroundSrc = url;
    } else if (updateData.thumbnailBackgroundSrc === '') {
        // Cho phép người dùng xóa ảnh nền
        template.thumbnailBackgroundSrc = '';
    }
    
    // TỰ ĐỘNG TẠO THUMBNAIL MỚI sau khi tất cả dữ liệu đã được cập nhật
    if (template.templateData && template.templateData.pages && template.templateData.pages.length > 0) {
        const thumbnailBuffer = await generateAutomaticThumbnail(template.templateData.pages, template.thumbnailBackgroundSrc);
        if (thumbnailBuffer) {
            const { url: newThumbnailUrl } = await uploadFileToR2(thumbnailBuffer, 'image/webp');
            template.imgSrc = newThumbnailUrl; // Ghi đè imgSrc cũ bằng thumbnail mới tạo
        }
    }
    
    // Đánh dấu rằng trường templateData đã bị sửa đổi
    template.markModified('templateData');
    await template.save();
    
    return await InvitationTemplate.findById(id);
};
// ++ KẾT THÚC THAY THẾ ++

// ... (Các hàm còn lại giữ nguyên) ...

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

const bulkCreateTemplates = async (templatesToCreate) => {
    if (!templatesToCreate || templatesToCreate.length === 0) {
        return [];
    }

    const incomingTitles = templatesToCreate.map(t => t.title);
    const incomingSlugs = templatesToCreate.map(t => t.slug);

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
            duplicatesInFile.add(template.title);
        } else {
            slugsInFile.add(template.slug);
        }
    }

    const existingTemplates = await InvitationTemplate.find({
        $or: [
            { title: { $in: incomingTitles } },
            { slug: { $in: incomingSlugs } }
        ]
    }).select('title');

    const existingTitlesInDb = new Set(existingTemplates.map(t => t.title));
    const allDuplicateTitles = [...new Set([...duplicatesInFile, ...existingTitlesInDb])];

    if (allDuplicateTitles.length > 0) {
        const error = new Error(`Phát hiện ${allDuplicateTitles.length} tiêu đề hoặc slug đã tồn tại/bị trùng lặp.`);
        error.name = 'DuplicateTitlesError';
        error.duplicates = allDuplicateTitles;
        throw error;
    }
    
    return await InvitationTemplate.insertMany(templatesToCreate, { ordered: false });
};

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

const bulkDeleteTemplatesByFilter = async (filter) => {
    if (!filter || Object.keys(filter).length === 0) {
        throw new Error('Cần có bộ lọc để xóa hàng loạt.');
    }
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