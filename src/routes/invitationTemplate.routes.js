const express = require('express');
const router = express.Router();
const { getInvitationTemplates, seedTemplates, getTemplateById } = require('../controllers/invitationTemplate.controller');
const invitationTemplateController = require('../controllers/invitationTemplate.controller');
const { upload } = require('../middleware/upload.middleware'); // Import upload middleware

router.get('/', getInvitationTemplates);
router.post('/seed', seedTemplates);
router.get('/:id', getTemplateById);
router.post('/reorder', invitationTemplateController.reorderTemplates);
router.post('/:id/view', invitationTemplateController.incrementView);
router.post('/bulk-import', upload.single('file'), invitationTemplateController.bulkCreateTemplates);

module.exports = router;