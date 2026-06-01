/**
 * GCM System Settings Controller (Micro-Module)
 */
const configController = require('../../../shared/controllers/configController');

module.exports = {
    getSettings: configController.getConfig,
    updateSettings: configController.updateConfig
};
