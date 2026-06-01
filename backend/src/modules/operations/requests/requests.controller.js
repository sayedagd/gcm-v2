/**
 * GCM Service Requests Controller (Micro-Module)
 */
const { list, upsert, remove } = require('../../../shared/controllers/crudController');

module.exports = {
    list: list('contact_submissions'), // Assuming contact_submissions is the base for requests
    upsert: upsert('contact_submissions'),
    remove: remove('contact_submissions')
};
