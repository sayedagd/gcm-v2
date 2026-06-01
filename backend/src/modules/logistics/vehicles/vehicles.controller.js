/**
 * GCM Vehicles Controller (Micro-Module)
 */
const { list, upsert, remove } = require('../../../shared/controllers/crudController');

module.exports = {
    list: list('vehicles'),
    upsert: upsert('vehicles'),
    remove: remove('vehicles')
};
