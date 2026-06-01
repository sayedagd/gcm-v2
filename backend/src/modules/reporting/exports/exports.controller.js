/**
 * GCM Exports Controller (Micro-Module)
 */
const { downloadSystemBackup } = require('../../../shared/controllers/systemController');

module.exports = {
    exportBackup: downloadSystemBackup
};
