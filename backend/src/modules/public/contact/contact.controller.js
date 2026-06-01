/**
 * GCM Contact Submissions Controller (Micro-Module)
 */
const { upsert, list, remove } = require('../../../shared/controllers/crudController');

module.exports = {
    submit: upsert('contact_submissions'),
    list: list('contact_submissions'),
    remove: remove('contact_submissions')
};
