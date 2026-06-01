/**
 * GCM System Backup Controller (Micro-Module)
 */
const systemController = require('../../../shared/controllers/systemController');

module.exports = {
    triggerBackup: systemController.triggerAutoBackup,
    downloadBackup: systemController.downloadSystemBackup,
    getStatus: systemController.getBackupStatusHandler,
    restoreBackup: systemController.restoreSystemBackup
};
