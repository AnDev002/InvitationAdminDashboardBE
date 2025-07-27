const express = require('express');
const router = express.Router();
const { getInvitationTemplates, seedTemplates, getTemplateById } = require('../controllers/invitationTemplate.controller');

router.get('/', getInvitationTemplates);
router.post('/seed', seedTemplates);
router.get('/:id', getTemplateById);

module.exports = router;