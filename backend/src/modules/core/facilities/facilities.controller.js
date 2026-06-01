/**
 * GCM Facilities Controller (Micro-Module)
 */
const { list, upsert, remove } = require('../../../shared/controllers/crudController');

module.exports = {
    list: list('facilities'),
    upsert: upsert('facilities'),
    remove: remove('facilities')
};
