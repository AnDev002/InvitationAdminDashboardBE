const mongoose = require('mongoose');

const invitationTemplateSchema = new mongoose.Schema({
    category: { type: String, required: true },
    group: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true, unique: true },
    imgSrc: { type: String, required: true },
    description: { type: String, default: '' },
    templateData: { type: mongoose.Schema.Types.Mixed },
    views: { type: Number, default: 0 },
    displayOrder: { 
        type: Number, 
        default: 0,
        index: true,
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
});

const InvitationTemplate = mongoose.model('InvitationTemplate', invitationTemplateSchema);
module.exports = InvitationTemplate;
