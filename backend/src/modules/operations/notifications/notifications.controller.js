/**
 * GCM Notifications Controller (Micro-Module)
 */
const notificationController = require('../../../shared/controllers/notificationController');
const { list, upsert } = require('../../../shared/controllers/crudController');

module.exports = {
    list: list('notifications'),
    upsert: upsert('notifications'),
    markAsRead: notificationController.markAsRead,
    markAllAsRead: notificationController.markAllAsRead,
    deleteAll: notificationController.deleteAllNotifications,
    deleteById: notificationController.deleteById
};
