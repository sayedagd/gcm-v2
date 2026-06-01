/**
 * GCM Companies Controller (Micro-Module)
 */
const { list, upsert, deleteCompany } = require('../../../shared/controllers/crudController');

module.exports = {
    list: list('companies'),
    upsert: upsert('companies'),
    remove: deleteCompany
};
