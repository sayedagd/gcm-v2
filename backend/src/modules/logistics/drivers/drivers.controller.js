/**
 * GCM Drivers Controller (Micro-Module)
 */
const { list, upsert, remove } = require('../../../shared/controllers/crudController');

module.exports = {
    list: list('drivers'),
    upsert: upsert('drivers'),
    remove: remove('drivers')
};
