const mongoose = require('mongoose');

const invitationTemplateSchema = new mongoose.Schema({
    category: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true, unique: true },
    imgSrc: { type: String, required: true },
    templateData: { type: mongoose.Schema.Types.Mixed }
});

const InvitationTemplate = mongoose.model('InvitationTemplate', invitationTemplateSchema);
module.exports = InvitationTemplate;
