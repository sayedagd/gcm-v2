/**
 * GCM AI Analytics Controller (Micro-Module)
 */
const aiController = require('../../../shared/controllers/aiController');

module.exports = {
    getAnalytics: aiController.getAnalytics,
    listSessions: aiController.getSessions,
    rateSession: aiController.rateSession
};
