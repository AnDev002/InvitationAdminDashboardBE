const express = require('express');
const router = express.Router();
const { getInvitationTemplates, seedTemplates, getTemplateById } = require('../controllers/invitationTemplate.controller');
const invitationTemplateController = require('../controllers/invitationTemplate.controller');

router.get('/', getInvitationTemplates);
router.post('/seed', seedTemplates);
router.get('/:id', getTemplateById);
router.post('/:id/view', invitationTemplateController.incrementView);
module.exports = router;