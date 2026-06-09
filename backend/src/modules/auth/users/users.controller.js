/**
 * GCM Users Controller (Micro-Module)
 */
const { log, logEvent } = require('../../../shared/utils/logger');
const { serverError } = require('../../../shared/utils/bilingualErrors');
const { deleteUser } = require('../../../shared/controllers/crudController');
const usersService = require('./users.service');

const list = async (req, res) => {
    const startedAt = Date.now();
    try {
        const rows = await usersService.listUsers();

        logEvent('users_list_query', {
            source: 'drizzle',
            durationMs: Date.now() - startedAt,
            rowCount: rows.length,
        });

        return res.json(rows);
    } catch (error) {
        log(`[Users/List Error] ${error.message}`);
        return res.status(500).json(serverError());
    }
};

const upsert = async (req, res) => {
    try {
        const payload = { ...req.body };
        const currentUser = req.user || {};
        const actorUserId = payload.user_id || currentUser.id || 'SYSTEM';
        const response = await usersService.upsertUser({ payload, actorUserId });
        return res.json(response);
    } catch (error) {
        if (error.status && error.body) {
            return res.status(error.status).json(error.body);
        }
        log(`[Users/Upsert Error] ${error.message}`);
        return res.status(500).json(serverError());
    }
};

module.exports = {
    list,
    upsert,
    deleteUser
};
