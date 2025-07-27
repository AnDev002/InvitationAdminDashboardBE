const InvitationTemplate = require('../models/invitationTemplate.model');

const queryInvitationTemplates = (filter) => {
  return InvitationTemplate.find(filter);
};

module.exports = {
  queryInvitationTemplates,
};