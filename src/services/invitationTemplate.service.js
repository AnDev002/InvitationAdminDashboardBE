// AdminBE/services/invitationTemplate.service.js
const InvitationTemplate = require('../models/invitationTemplate.model');
const { uploadFileToR2 } = require('./r2.service'); 
const sharp = require('sharp');
const axios = require('axios');

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

// --- BẮT ĐẦU THAY ĐỔI: Thêm hàm "làm sạch" giá trị CSS ---
function sanitizeCssValue(value) {
    if (typeof value !== 'string') return '';
    // Loại bỏ các ký tự có thể phá vỡ thuộc tính style trong SVG
    return value.replace(/["';]/g, '');
}
// --- KẾT THÚC THAY ĐỔI ---

// --- BẮT ĐẦU THAY THẾ: HÀM RENDER ĐÃ ĐƯỢC NÂNG CẤP TOÀN DIỆN ---
async function renderPageToBuffer(page) {
    if (!page || !page.canvasWidth || !page.canvasHeight || page.canvasWidth <= 0 || page.canvasHeight <= 0) {
        console.error("Thumbnail Gen Error: Dữ liệu trang không hợp lệ hoặc thiếu kích thước canvas.", { pageId: page?.id });
        return null;
    }

    try {
        // 1. Tạo canvas nền ban đầu
        const baseCanvas = sharp({
            create: {
                width: page.canvasWidth,
                height: page.canvasHeight,
                channels: 4,
                background: page.backgroundColor || '#FFFFFF'
            }
        });

        let canvasBuffer;

        // 2. Xử lý và ghép ảnh nền (NẾU CÓ) một cách an toàn
        if (page.backgroundImage && typeof page.backgroundImage === 'string' && page.backgroundImage.startsWith('http')) {
            try {
                const bgResponse = await axios.get(page.backgroundImage, { responseType: 'arraybuffer', timeout: 7000 });
                // KIỂM TRA QUYẾT ĐỊNH: Thử đọc metadata, sẽ báo lỗi nếu không phải ảnh hợp lệ
                await sharp(bgResponse.data).metadata(); 
                const resizedBgBuffer = await sharp(bgResponse.data)
                    .resize(page.canvasWidth, page.canvasHeight, { fit: 'cover' })
                    .toBuffer();
                canvasBuffer = await baseCanvas.composite([{ input: resizedBgBuffer }]).toBuffer();
            } catch (e) {
                console.error(`Thumbnail Gen Error: Không thể tải hoặc xử lý ảnh nền: ${page.backgroundImage}. Lý do: ${e.message}`);
                canvasBuffer = await baseCanvas.toBuffer(); // Dùng canvas gốc nếu ảnh nền lỗi
            }
        } else {
            canvasBuffer = await baseCanvas.toBuffer();
        }

        // 3. Chuẩn bị các đối tượng (items) để ghép
        const compositeOperations = [];
        const sortedItems = [...(page.items || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        for (const item of sortedItems) {
            if (!item.visible) continue;

            let itemBuffer;

            // Bọc toàn bộ logic tạo buffer cho MỖI item trong một try...catch riêng
            try {
                // Xử lý ảnh
                if (item.type === 'image' && item.url && typeof item.url === 'string' && item.url.startsWith('http')) {
                    const itemImgRes = await axios.get(item.url, { responseType: 'arraybuffer', timeout: 7000 });
                    // KIỂM TRA QUYẾT ĐỊNH
                    await sharp(itemImgRes.data).metadata();
                    itemBuffer = await sharp(itemImgRes.data)
                        .resize(Math.round(item.width), Math.round(item.height))
                        .toBuffer();
                }
                // Xử lý text (đã được làm an toàn trong file của bạn)
                else if (item.type === 'text' && item.content) {
                    const svgWidth = Math.max(1, Math.round(item.width || 100));
                    const svgHeight = Math.max(1, Math.round(item.height || 50));
                    const fontSize = Math.max(1, item.fontSize || 16);

                    // **NÂNG CẤP**: "Làm sạch" các giá trị CSS trước khi đưa vào SVG
                    const fontFamily = sanitizeCssValue(item.fontFamily || 'Arial');
                    const color = sanitizeCssValue(item.color || '#000');
                    const fontWeight = sanitizeCssValue(item.fontWeight || 'normal');
                    const fontStyle = sanitizeCssValue(item.fontStyle || 'normal');
                    const textDecoration = sanitizeCssValue(item.textDecoration || 'none');

                    const svgText = `
                        <svg width="${svgWidth}" height="${svgHeight}">
                            <style>
                                .text { 
                                    font-family: "${fontFamily}";
                                    font-size: ${fontSize}px; 
                                    fill: ${color};
                                    font-weight: ${fontWeight};
                                    font-style: ${fontStyle};
                                    text-decoration: ${textDecoration};
                                    white-space: pre-wrap;
                                }
                            </style>
                            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="text">${escapeXml(item.content)}</text>
                        </svg>
                    `;
                    const svgBuffer = Buffer.from(svgText);
                    await sharp(svgBuffer).metadata(); // Kiểm tra SVG hợp lệ
                    itemBuffer = svgBuffer;
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
                // Nếu có bất kỳ lỗi nào (tải ảnh, xử lý ảnh, tạo SVG lỗi), ghi log và bỏ qua item đó
                console.error(`Thumbnail Gen Error: Bỏ qua đối tượng không hợp lệ. Lý do: ${e.message}`, { 
                    pageId: page.id, 
                    itemId: item.id, 
                    itemType: item.type, 
                    itemUrl: item.url
                });
                continue; // Chuyển sang item tiếp theo
            }
        }
        
        // 4. Ghép tất cả các layer item hợp lệ và trả về kết quả
        return await sharp(canvasBuffer).composite(compositeOperations).webp({ quality: 80 }).toBuffer();
    } catch (error) {
        console.error(`FATAL Thumbnail Gen Error on page render: ${error.message}`, { pageId: page?.id });
        return null;
    }
}

// --- KẾT THÚC THAY THẾ ---

async function generateAutomaticThumbnail(pages, backgroundUrl) {
    if (!pages || pages.length === 0) return null;

    try {
        if (pages.length === 1) {
            return await renderPageToBuffer(pages[0]);
        } else {
            const page1Buffer = await renderPageToBuffer(pages[0]);
            const page2Buffer = await renderPageToBuffer(pages[1]);
            // Nếu một trong hai trang không render được, sẽ không tạo thumbnail
            if (!page1Buffer || !page2Buffer) {
                console.error("Thumbnail Gen Error: Một trong các trang không thể render, hủy tạo thumbnail.");
                return null;
            }

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

            return await finalCanvas.composite(compositeOps).webp({ quality: 85 }).toBuffer();
        }
    } catch (error) {
        console.error(`FATAL Thumbnail Gen Error during composition: ${error.message}`);
        return null;
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

    if (files && files.length > 0) {
        const uploadPromises = files.map(async (file) => {
            const processedBuffer = await sharp(file.buffer)
                .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer();
            const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
            fileUrlMap.set(file.fieldname, url);
        });
        await Promise.all(uploadPromises);
    }

    if (fileUrlMap.has('thumbnailBackground')) {
        template.thumbnailBackgroundSrc = fileUrlMap.get('thumbnailBackground');
    } else if (updateData.thumbnailBackgroundSrc === '') {
        template.thumbnailBackgroundSrc = '';
    }

    // ======================= START: LOGIC SỬA LỖI =======================
    if (templateDataObject.pages && Array.isArray(templateDataObject.pages)) {
        templateDataObject.pages.forEach(page => {
            // 1. Cập nhật ảnh nền cho trang từ placeholder
            if (typeof page.backgroundImage === 'string' && page.backgroundImage.startsWith('__FILE_PLACEHOLDER_')) {
                const fieldName = page.backgroundImage.replace('__FILE_PLACEHOLDER_', '');
                if (fileUrlMap.has(fieldName)) {
                    page.backgroundImage = fileUrlMap.get(fieldName);
                }
            }

            // 2. Cập nhật URL cho các item hình ảnh từ placeholder
            if (page.items && Array.isArray(page.items)) {
                page.items.forEach(item => {
                    const itemImagePlaceholderPrefix = `__FILE_PLACEHOLDER_itemImage_${page.id}_${item.id}`;
                    if (item.type === 'image' && typeof item.url === 'string' && item.url.startsWith('__FILE_PLACEHOLDER_')) {
                         const fieldName = item.url.replace('__FILE_PLACEHOLDER_', '');
                         if (fileUrlMap.has(fieldName)) {
                            item.url = fileUrlMap.get(fieldName);
                         }
                    }
                });
            }
        });
    }
    // ======================= END: LOGIC SỬA LỖI =======================

    template.templateData = templateDataObject;
    
    if (template.templateData && template.templateData.pages && template.templateData.pages.length > 0) {
        // Hàm render thumbnail sẽ được gọi ở đây
        const thumbnailBuffer = await generateAutomaticThumbnail(template.templateData.pages, template.thumbnailBackgroundSrc);
        if (thumbnailBuffer) {
            const { url: newThumbnailUrl } = await uploadFileToR2(thumbnailBuffer, 'image/webp');
            template.imgSrc = newThumbnailUrl;
        } else {
             console.warn(`Cảnh báo: Không thể tạo ảnh thumbnail cho mẫu "${template.title}". Ảnh đại diện sẽ không được cập nhật.`);
        }
    }
    
    template.markModified('templateData');
    await template.save();
    
    return await InvitationTemplate.findById(id);
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
