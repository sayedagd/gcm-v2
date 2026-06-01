/**
 * GCM Services Controller (Micro-Module)
 */
const { list, upsert, remove } = require('../../../shared/controllers/crudController');

module.exports = {
    list: list('services'),
    upsert: upsert('services'),
    remove: remove('services')
};
