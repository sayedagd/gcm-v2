/**
 * GCM Landing CMS Controller (Micro-Module)
 */
const { getConfig, updateConfig } = require('../../../shared/controllers/configController');

module.exports = {
    getLanding: getConfig,
    updateLanding: updateConfig
};
