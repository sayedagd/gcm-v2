/**
 * GCM System Health Controller (Micro-Module)
 */
const systemController = require('../../../shared/controllers/systemController');

module.exports = {
    checkHealth: systemController.getHealth,
    ping: systemController.getPing
};
