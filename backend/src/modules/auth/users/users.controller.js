/**
 * GCM Users Controller (Micro-Module)
 */
const { list, upsert, remove, deleteUser } = require('../../../shared/controllers/crudController');

module.exports = {
    list: list('users'),
    upsert: upsert('users'),
    remove: remove('users'),
    deleteUser
};
