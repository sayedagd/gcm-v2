/**
 * GCM Notifications Controller
 */
const { query } = require('../../../database');

const markAsRead = async (req, res) => {
    try {
        await query('UPDATE notifications SET "read" = TRUE WHERE id = $1', [req.params.id]);
        res.json({ status: 'success' });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
};

const markAllAsRead = async (req, res) => {
    try {
        await query('UPDATE notifications SET "read" = TRUE');
        res.json({ status: 'success' });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
};

const deleteAllNotifications = async (req, res) => {
    try {
        await query('DELETE FROM notifications');
        res.json({ status: 'success' });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
};

const deleteById = async (req, res) => {
    try {
        await query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
        res.json({ status: 'success' });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
};

module.exports = {
    markAsRead,
    markAllAsRead,
    deleteAllNotifications,
    deleteById
};
