// TrainData/AdminBE/services/font.service.js
const Font = require('../models/font.model');
const { deleteFileFromR2 } = require('./r2.service');

const getAllFonts = () => Font.find().sort({ name: 1 });

const createFont = (fontData) => Font.create(fontData);

const deleteFontById = async (id) => {
    const font = await Font.findById(id);
    if (font && font.url) {
        const fileKey = font.url.split('/').pop();
        await deleteFileFromR2(fileKey);
    }
    await Font.findByIdAndDelete(id);
};

const bulkCreateFonts = async (fontsData) => {
    if (!fontsData || fontsData.length === 0) {
        return [];
    }
    return await Font.insertMany(fontsData, { ordered: false });
};

module.exports = {
    getAllFonts,
    createFont,
    deleteFontById,
    bulkCreateFonts
};