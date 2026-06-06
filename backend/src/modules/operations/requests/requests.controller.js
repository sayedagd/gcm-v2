/**
 * GCM Service Requests Controller (Micro-Module)
 */
const { list, upsert, remove } = require('../../../shared/controllers/crudController');

module.exports = {
    list: list('permission_requests'),
    upsert: upsert('permission_requests'),
    remove: remove('permission_requests')
};
