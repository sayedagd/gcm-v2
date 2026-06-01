/**
 * GCM Projects Controller (Micro-Module)
 */
const { list, upsert, deleteProject } = require('../../../shared/controllers/crudController');

module.exports = {
    list: list('projects'),
    upsert: upsert('projects'),
    remove: deleteProject
};
