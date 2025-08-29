// AdminBE/controllers/invitationTemplate.controller.js

const mongoose = require('mongoose');
const InvitationTemplate = require('../models/invitationTemplate.model');
const Settings = require('../models/settings.model'); // ĐÃ THÊM: Import model Settings
const invitationTemplateService = require('../services/invitationTemplate.service');
const APIFeatures = require('../utils/apiFeature');
const sharp = require('sharp');
const { uploadFileToR2 } = require('../services/r2.service');
const xlsx = require('xlsx');
const AdmZip = require('adm-zip');

const processContentImages = async (htmlContent) => {
    // Regex để tìm các ảnh base64 hoặc placeholder trong nội dung
    const regex = /<img[^>]+src="data:image\/[^;]+;base64[^>]+"/g;
    const matches = htmlContent.match(regex);
    if (!matches) return htmlContent;
    
    let newHtmlContent = htmlContent;
    for (const imgTag of matches) {
        const base64Data = imgTag.match(/src="data:image\/[^;]+;base64,([^"]+)"/)[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const processedBuffer = await sharp(buffer)
            .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
        
        const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
        newHtmlContent = newHtmlContent.replace(imgTag, `<img src="${url}" />`);
    }
    return newHtmlContent;
};

const getInvitationTemplates = async (req, res, next) => {
    try {
        const { search } = req.query;
        let initialQuery = {};
        if (search) {
            initialQuery = { $or: [
                { title: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ]};
        }
        const features = new APIFeatures(invitationTemplateService.queryInvitationTemplates(initialQuery), req.query)
            .filter().sort().limitFields().paginate();
        const templates = await features.query;
        res.status(200).json({
            status: 'success',
            results: templates.length,
            data: templates,
        });
    } catch (error) {
        next(error);
    }
};

const getTemplateGroups = async (req, res, next) => {
    try {
        const { category } = req.query;
        // Nếu không có category, trả về mảng rỗng thay vì lỗi, để frontend xử lý dễ hơn
        if (!category) {
            return res.status(200).json({ status: 'success', data: [] });
        }
        const groups = await invitationTemplateService.getUniqueGroupsForCategory(category);
        res.status(200).json({
            status: 'success',
            data: groups,
        });
    } catch (error) {
        next(error);
    }
};



const getTemplateById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID mẫu thiệp không hợp lệ.' });
        }
        const template = await invitationTemplateService.getTemplateById(req.params.id); //
        if (!template) {
            return res.status(404).json({ message: 'Không tìm thấy mẫu thiệp.' });
        }
        res.status(200).json({ status: 'success', data: template });
    } catch (error) {
        next(error);
    }
};

const createTemplate = async (req, res, next) => {
    try {
        const parsedTemplateData = JSON.parse(req.body.templateData || '{}');
        const parsedLoveGiftsButton = req.body.loveGiftsButton ? JSON.parse(req.body.loveGiftsButton) : null;
        
        const newTemplatePayload = {
            ...req.body,
            templateData: parsedTemplateData,
            loveGiftsButton: parsedLoveGiftsButton,
        };

        // Xử lý tất cả các file được gửi lên
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                const processedBuffer = await sharp(file.buffer)
                    .resize({ width: 800, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 90 })
                    .toBuffer();
                const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
                return { fieldname: file.fieldname, url: url };
            });

            const uploadedFiles = await Promise.all(uploadPromises);

            uploadedFiles.forEach(uploadedFile => {
                // Gán URL cho ảnh đại diện (thumbnail)
                if (uploadedFile.fieldname === 'image') {
                    newTemplatePayload.imgSrc = uploadedFile.url;
                } 
                // Gán URL cho các ảnh nền canvas
                else if (uploadedFile.fieldname.startsWith('background_')) {
                    const pageId = uploadedFile.fieldname.split('_')[1];
                    const pageIndex = newTemplatePayload.templateData.pages.findIndex(p => p.id === pageId);
                    if (pageIndex !== -1) {
                        newTemplatePayload.templateData.pages[pageIndex].backgroundImage = uploadedFile.url;
                    }
                }
            });
        }

        if (!newTemplatePayload.imgSrc) {
            return res.status(400).json({ message: 'Ảnh đại diện là bắt buộc khi tạo mẫu mới.' });
        }

        // Xử lý ảnh base64 trong phần mô tả (nếu có)
        newTemplatePayload.description = await processContentImages(req.body.description || '');

        const newTemplate = await invitationTemplateService.createTemplate(newTemplatePayload);
        res.status(201).json({ status: 'success', data: newTemplate });
    } catch (error) {
        console.error("Error creating template:", error);
        if (error instanceof SyntaxError) {
             return res.status(400).json({ message: 'Dữ liệu templateData hoặc loveGiftsButton không phải là JSON hợp lệ.' });
        }
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Tên mẫu thiệp đã tồn tại.'});
        }
        next(error);
    }
};


const updateTemplate = async (req, res, next) => {
    try {
        // Log kiểu dữ liệu để debug
        console.log('Received templateData type:', typeof req.body.templateData);

        // Kiểm tra xem templateData có phải là string không trước khi parse
        if (typeof req.body.templateData !== 'string') {
            throw new Error('templateData phải là một chuỗi JSON.');
        }

        const updatePayload = {
            ...req.body,
            // Parse các trường JSON một cách an toàn
            templateData: JSON.parse(req.body.templateData),
            loveGiftsButton: req.body.loveGiftsButton ? JSON.parse(req.body.loveGiftsButton) : null,
        };

        const updatedTemplate = await invitationTemplateService.updateTemplateById(
            req.params.id,
            updatePayload, // Dữ liệu đã được parse
            req.files      // Tất cả các file từ multer
        );

        if (!updatedTemplate) {
            return res.status(404).json({ message: 'Không tìm thấy mẫu thiệp.' });
        }
        res.status(200).json({ status: 'success', data: updatedTemplate });

    } catch (error) {
        console.error("Lỗi xảy ra trong controller updateTemplate:", error);
        console.error("Error Body nhận được:", req.body); // Log lại body khi có lỗi
        next(error);
    }
};



const deleteTemplate = async (req, res, next) => {
    try {
        await invitationTemplateService.deleteTemplateById(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

const seedTemplates = async (req, res, next) => {
    // ... (giữ nguyên hàm seed)
};

const getTemplateCategories = async (req, res, next) => {
    try {
        const categories = await invitationTemplateService.getUniqueCategories();
        res.status(200).json({
            status: 'success',
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

const getTemplateTypesForCategory = async (req, res, next) => {
    try {
        const { category, group } = req.query;
        let types = [];
        if (category && group) {
            types = await invitationTemplateService.getUniqueTypesForCategoryAndGroup(category, group);
        } else if (category) {
            types = await invitationTemplateService.getUniqueTypesForCategory(category);
        }
        
        res.status(200).json({
            status: 'success',
            data: types,
        });
    } catch (error) {
        next(error);
    }
};

const bulkCreateTemplates = async (req, res, next) => {
    try {
        if (!req.file || req.file.mimetype !== 'application/zip') {
            return res.status(400).json({ message: 'Vui lòng tải lên một file .zip.' });
        }

        const zip = new AdmZip(req.file.buffer);
        const zipEntries = zip.getEntries();

        // Tìm và đọc file data.xlsx
        const excelEntry = zipEntries.find(entry => entry.entryName === 'data.xlsx');
        if (!excelEntry) {
            return res.status(400).json({ message: 'Không tìm thấy file data.xlsx trong file zip.' });
        }
        const workbook = xlsx.read(excelEntry.getData(), { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!rows || rows.length === 0) {
            return res.status(400).json({ message: 'File data.xlsx rỗng hoặc không có dữ liệu.' });
        }

        // Tạo một map chứa buffer của tất cả các ảnh trong thư mục /images
        const imageMap = new Map();
        zipEntries.forEach(entry => {
            if (entry.entryName.startsWith('images/') && !entry.isDirectory) {
                const fileName = entry.entryName.split('/').pop();
                imageMap.set(fileName, entry.getData());
            }
        });
        
        const defaultImgSrc = 'https://placehold.co/400x300/e0e0e0/777?text=Chua+thiet+ke';

        const processedTemplates = await Promise.all(rows.map(async (row, index) => {
            
            // Hàm trợ giúp để tìm, xử lý và tải ảnh lên R2
            const uploadImageByName = async (imageName) => {
                if (!imageName || !imageMap.has(imageName)) return null;
                const imageBuffer = imageMap.get(imageName);
                const processedBuffer = await sharp(imageBuffer)
                    .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toBuffer();
                const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
                return url;
            };

            const canvasWidth = parseInt(row.canvasWidth, 10) || 800;
            const canvasHeight = parseInt(row.canvasHeight, 10) || 600;
            
            const items = [];
            for (let i = 1; i <= 3; i++) {
                if (row[`item${i}_type`]) {
                    const itemWidth = parseInt(row[`item${i}_width`], 10) || (row[`item${i}_type`] === 'text' ? 300 : 150);
                    const itemHeight = parseInt(row[`item${i}_height`], 10) || (row[`item${i}_type`] === 'text' ? 50 : 150);
                    const position = calculateItemPosition(row[`item${i}_position`], itemWidth, itemHeight, canvasWidth, canvasHeight);

                    const newItem = {
                        id: `item_${index}_${i}`,
                        type: row[`item${i}_type`], x: position.x, y: position.y,
                        width: itemWidth, height: itemHeight, rotation: 0, opacity: 1,
                    };

                    if (newItem.type === 'text' && row[`item${i}_content`]) {
                        newItem.content = row[`item${i}_content`];
                        newItem.fontFamily = row[`item${i}_font`] || 'Arial';
                        newItem.fontSize = parseInt(row[`item${i}_fontSize`], 10) || 24;
                        newItem.color = row[`item${i}_color`] || '#000000';
                        newItem.textAlign = 'center';
                        items.push(newItem);
                    } else if (newItem.type === 'image' && row[`item${i}_imageName`]) {
                        newItem.url = await uploadImageByName(row[`item${i}_imageName`]);
                        if (newItem.url) items.push(newItem);
                    }
                }
            }

            let eventSettings = {};
            try {
                if (row.eventSettingsJson) eventSettings = JSON.parse(row.eventSettingsJson);
            } catch (e) { console.warn(`Dòng ${index + 2}: Dữ liệu eventSettingsJson không hợp lệ.`); }

            const templateData = {
                width: canvasWidth,
                height: canvasHeight,
                pages: [{
                    id: `page_${index}_1`,
                    name: 'Trang 1',
                    items: items,
                    backgroundColor: row.canvasBackgroundColor || '#FFFFFF',
                    backgroundImage: await uploadImageByName(row.canvasBackgroundImageName),
                }],
                settings: eventSettings,
            };

            return {
                title: row.title,
                category: row.category,
                group: row.group,
                type: row.type,
                description: row.description || '',
                imgSrc: (await uploadImageByName(row.thumbnailName)) || defaultImgSrc,
                templateData: templateData,
                isActive: row.isActive !== undefined ? row.isActive : true,
            };
        }));

        const result = await invitationTemplateService.bulkCreateTemplates(processedTemplates.filter(t => t.title)); // Lọc bỏ các hàng không có tiêu đề

        res.status(201).json({
            status: 'success',
            message: `Đã thêm thành công ${result.length} mẫu thiệp từ file zip.`,
            data: result,
        });
    } catch (error) {
        if (error.code === 11000 || (error.writeErrors && error.writeErrors.some(e => e.err.code === 11000))) {
             res.status(409).json({
                 message: `Thêm mới thất bại. Có lỗi xảy ra, có thể do trùng tiêu đề mẫu. Vui lòng kiểm tra lại file.`,
             });
        } else {
             next(error);
        }
    }
};


const incrementView = async (req, res, next) => {
  try {
    await invitationTemplateService.incrementTemplateView(req.params.id);
    res.status(200).json({ success: true, message: 'View counted.' });
  } catch (error) {
    console.error(`Could not count view for template ${req.params.id}:`, error);
    res.status(200).json({ success: false });
  }
};

const reorderTemplates = async (req, res, next) => {
    try {
        const { templateIds } = req.body;
        if (!Array.isArray(templateIds) || templateIds.length === 0) {
            return res.status(400).json({ message: 'Danh sách ID thiệp không hợp lệ' });
        }
        await invitationTemplateService.reorderTemplates(templateIds);
        res.status(200).json({ message: 'Cập nhật thứ tự thành công' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getInvitationTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    seedTemplates,
    getTemplateCategories,
    getTemplateTypesForCategory,
    bulkCreateTemplates,
    incrementView,
    getTemplateGroups,
    reorderTemplates
};
