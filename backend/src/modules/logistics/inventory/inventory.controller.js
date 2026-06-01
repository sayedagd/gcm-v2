/**
 * GCM Inventory Controller (Micro-Module)
 */
const { list, upsert, remove } = require('../../../shared/controllers/crudController');

module.exports = {
    listContainers: list('containers'),
    upsertContainer: upsert('containers'),
    listTanks: list('tanks'),
    upsertTank: upsert('tanks'),
    listScales: list('scales'),
    upsertScale: upsert('scales'),
    listSizes: list('inventory_sizes'),
    upsertSize: upsert('inventory_sizes'),
    remove: (table) => remove(table)
};
