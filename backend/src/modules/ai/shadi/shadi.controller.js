/**
 * GCM Shadi Assistant Controller (Micro-Module)
 */
const aiController = require('../../../shared/controllers/aiController');

module.exports = {
    chat: aiController.chatProxy,
    logSession: aiController.logSession,
    getSession: aiController.getSessionDetails
};
