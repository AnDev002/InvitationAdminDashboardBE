// AdminBE/controllers/invitationTemplate.controller.js

const mongoose = require('mongoose');
const InvitationTemplate = require('../models/invitationTemplate.model');
const Settings = require('../models/settings.model');
const invitationTemplateService = require('../services/invitationTemplate.service');
const APIFeatures = require('../utils/apiFeature');
const sharp = require('sharp');
const { uploadFileToCloudflare } = require('../services/cloudflare.service');
const xlsx = require('xlsx');
const AdmZip = require('adm-zip');
const bulkCreateTemplates = async (req, res, next) => {
    try {
        const allowedMimeTypes = ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip', 'application/octet-stream'];
        const isFileValid = req.file && (allowedMimeTypes.includes(req.file.mimetype) || req.file.originalname.toLowerCase().endsWith('.zip'));
        if (!isFileValid) {
            return res.status(400).json({ message: 'Định dạng file .zip không hợp lệ hoặc không được hỗ trợ.' });
        }

        const zip = new AdmZip(req.file.buffer);
        const zipEntries = zip.getEntries();

        const excelEntry = zipEntries.find(entry => entry.entryName.toLowerCase() === 'data.xlsx');
        if (!excelEntry) {
            return res.status(400).json({ message: 'Không tìm thấy file data.xlsx trong file zip.' });
        }
        const workbook = xlsx.read(excelEntry.getData(), { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: 'File data.xlsx rỗng hoặc không có dữ liệu hợp lệ.' });
        }

        const imageEntryMap = new Map();
        zipEntries.forEach(entry => {
            if (entry.entryName.startsWith('images/') && !entry.isDirectory) {
                const fileName = entry.entryName.split('/').pop();
                imageEntryMap.set(fileName.toLowerCase(), entry); // Chỉ lưu tham chiếu, không đọc buffer
            }
        });
        
        const defaultImgSrc = 'https://placehold.co/400x300/e0e0e0/777?text=Chua+thiet+ke';

        const templatesByTitle = rows.reduce((acc, row) => {
            const sanitizedTitle = row.title.trim(); 
            if (!acc[sanitizedTitle]) {
                acc[sanitizedTitle] = [];
            }
            acc[sanitizedTitle].push(row);
            return acc;
        }, {});


        const processedTemplates = await Promise.all(Object.values(templatesByTitle).map(async (templateRows) => {
            const firstRow = templateRows[0];
            const canvasWidth = parseInt(firstRow.canvasWidth, 10) || 800;
            const canvasHeight = parseInt(firstRow.canvasHeight, 10) || 1200;

            const uploadImageByName = async (imageName) => {
                if (!imageName) return null;
                const lowerCaseImageName = imageName.toLowerCase();

                // Lấy entry từ map
                if (!imageEntryMap.has(lowerCaseImageName)) {
                    throw new Error(`Ảnh "${imageName}" được khai báo trong Excel nhưng không tìm thấy trong thư mục /images/ của file zip.`);
                }

                // *** CHỈ ĐỌC BUFFER KHI THỰC SỰ CẦN DÙNG ***
                const imageBuffer = imageEntryMap.get(lowerCaseImageName).getData(); // Đọc buffer tại đây

                const processedBuffer = await sharp(imageBuffer)
                    .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toBuffer();
                const { url } = await uploadFileToCloudflare(processedBuffer);
                return url;
            };
            
            const pages = await Promise.all(templateRows.map(async (row, pageIndex) => {
                const items = [];
                for (let i = 1; i <= 3; i++) {
                    if (row[`item${i}_type`]) {
                        const itemWidth = parseInt(row[`item${i}_width`], 10) || (row[`item${i}_type`] === 'text' ? 300 : 150);
                        const itemHeight = parseInt(row[`item${i}_height`], 10) || (row[`item${i}_type`] === 'text' ? 50 : 150);
                        const position = calculateItemPosition(row[`item${i}_position`], itemWidth, itemHeight, canvasWidth, canvasHeight);
                        const newItem = {
                            id: `item_${pageIndex}_${i}`, type: row[`item${i}_type`], x: position.x, y: position.y,
                            width: itemWidth, height: itemHeight, rotation: 0, opacity: 1, zIndex: 100
                        };
                        if (newItem.type === 'text' && row[`item${i}_content`]) {
                            Object.assign(newItem, {
                                content: row[`item${i}_content`], fontFamily: row[`item${i}_font`] || 'Arial',
                                fontSize: parseInt(row[`item${i}_fontSize`], 10) || 24,
                                color: row[`item${i}_color`] || '#000000', textAlign: 'center'
                            });
                            items.push(newItem);
                        } else if (newItem.type === 'image' && row[`item${i}_imageName`]) {
                            newItem.url = await uploadImageByName(row[`item${i}_imageName`]);
                            if (newItem.url) items.push(newItem);
                        }
                    }
                }

                return {
                    id: `page_${pageIndex}`,
                    name: row.pageName || `Trang ${pageIndex + 1}`,
                    items: items,
                    backgroundColor: row.pageBackgroundColor || '#FFFFFF',
                    backgroundImage: await uploadImageByName(row.pageBackgroundImageName),
                };
            }));

            const eventSettings = {};
            const templateData = { width: canvasWidth, height: canvasHeight, pages: pages, settings: eventSettings };
            const title = firstRow.title.trim();
            const slug = title
                .toLowerCase()
                .replace(/ /g, '-')
                .replace(/[^\w-]+/g, '');

            return {
                title: firstRow.title.trim(), 
                slug: slug,
                category: firstRow.category, 
                group: firstRow.group, 
                type: firstRow.type,
                description: firstRow.description || '',
                imgSrc: (await uploadImageByName(firstRow.thumbnailName)) || defaultImgSrc,
                templateData: templateData,
                isActive: firstRow.isActive !== undefined ? firstRow.isActive : true,
            };
        }));

        const result = await invitationTemplateService.bulkCreateTemplates(processedTemplates);

        res.status(201).json({
            status: 'success',
            message: `Đã thêm thành công ${result.length} mẫu thiệp từ file zip.`,
            data: result,
        });
    } catch (error) {

        if (error.name === 'DuplicateTitlesError') {
            return res.status(409).json({ 
                message: `${error.message} Các tiêu đề bị trùng: ${error.duplicates.join(', ')}. Vui lòng kiểm tra lại file Excel hoặc các mẫu đã có.`,
                duplicates: error.duplicates 
            });
        }
        if (error.message.startsWith('Ảnh "')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.code === 11000 || (error.writeErrors && error.writeErrors.some(e => e.err.code === 11000))) {
            let duplicateTitles = [];
            if (error.writeErrors) {
                duplicateTitles = error.writeErrors
                    .map(err => err.op?.title)
                    .filter(Boolean);
            }
            
            if (duplicateTitles.length === 0 && error.message) {
                const match = error.message.match(/dup key: { title: "([^"]+)" }/);
                if (match && match[1]) {
                    duplicateTitles.push(match[1]);
                }
            }

            const uniqueDuplicates = [...new Set(duplicateTitles)];
            const errorMessage = uniqueDuplicates.length > 0
                ? `Thêm mới thất bại do trùng lặp tiêu đề đã có: ${uniqueDuplicates.join(', ')}. Vui lòng kiểm tra lại.`
                : `Thêm mới thất bại. Có lỗi xảy ra, có thể do trùng tiêu đề mẫu.`;

            return res.status(409).json({ message: errorMessage, duplicates: uniqueDuplicates });
        } 
        else {
            console.error("Lỗi khi xử lý file Excel:", error);
            next(error);
        }
    }
};

const processContentImages = async (htmlContent) => {
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
        
        const { url } = await uploadFileToCloudflare(processedBuffer);
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

const calculateItemPosition = (position, itemWidth, itemHeight, canvasWidth, canvasHeight) => {
    const padding = 20;
    let x = 0, y = 0;
    switch (position) {
        case 'top-center': x = (canvasWidth - itemWidth) / 2; y = padding; break;
        case 'middle-center': x = (canvasWidth - itemWidth) / 2; y = (canvasHeight - itemHeight) / 2; break;
        case 'bottom-center': x = (canvasWidth - itemWidth) / 2; y = canvasHeight - itemHeight - padding; break;
        case 'middle-left': x = padding; y = (canvasHeight - itemHeight) / 2; break;
        case 'middle-right': x = canvasWidth - itemWidth - padding; y = (canvasHeight - itemHeight) / 2; break;
        default: x = (canvasWidth - itemWidth) / 2; y = (canvasHeight - itemHeight) / 2;
    }
    return { x, y };
};

const getTemplateGroups = async (req, res, next) => {
    try {
        const { category } = req.query;
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
        const template = await invitationTemplateService.getTemplateById(req.params.id);
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

        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                const processedBuffer = await sharp(file.buffer)
                    .resize({ width: 800, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 90 })
                    .toBuffer();
                const { url } = await uploadFileToCloudflare(processedBuffer);
                return { fieldname: file.fieldname, url: url };
            });

            const uploadedFiles = await Promise.all(uploadPromises);

            uploadedFiles.forEach(uploadedFile => {
                if (uploadedFile.fieldname === 'image') {
                    newTemplatePayload.imgSrc = uploadedFile.url;
                } 
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
        // Parse JSON strings from FormData
        const updatePayload = {
            ...req.body,
            templateData: JSON.parse(req.body.templateData || '{}'),
            loveGiftsButton: req.body.loveGiftsButton ? JSON.parse(req.body.loveGiftsButton) : null,
        };
        
        // Pass the request files to the service function
        const updatedTemplate = await invitationTemplateService.updateTemplateById(
            req.params.id,
            updatePayload,
            req.files // Pass the files array
        );

        if (!updatedTemplate) {
            return res.status(404).json({ message: 'Không tìm thấy mẫu thiệp.' });
        }
        res.status(200).json({ status: 'success', data: updatedTemplate });

    } catch (error) {
        if (error instanceof SyntaxError) {
            return res.status(400).json({ message: 'Lỗi cú pháp: Dữ liệu không phải là JSON hợp lệ.' });
        }
        console.error("Lỗi khi cập nhật template:", error);
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

// --- CONTROLLER MỚI ĐỂ XÓA HÀNG LOẠT ---
const bulkDeleteTemplatesByFilter = async (req, res, next) => {
    try {
        const filters = req.body;
        const result = await invitationTemplateService.bulkDeleteTemplatesByFilter(filters);
        res.status(200).json({
            status: 'success',
            message: `Đã xóa thành công ${result.deletedCount} mẫu thiệp.`,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};
// --- KẾT THÚC CONTROLLER MỚI ---

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
    reorderTemplates,
    bulkDeleteTemplatesByFilter,
};