/**
 * GCM Asset Requests Controller
 */
const { query } = require('../../../../database');
const { upsert, remove } = require('../../../shared/controllers/crudController');

module.exports = {
    list: async (req, res) => {
        try {
            const table = 'asset_requests';
            const supplierId = req.user?.supplier_id;
            const role = req.user?.role;

            let sql = `SELECT * FROM ${table}`;
            let params = [];
            
            // Reusing common filtering logic
            if (role === 'SUBCONTRACTOR') {
                sql += ` WHERE supplier_id = $1`;
                params.push(supplierId);
            } else if (role !== 'ADMIN' && role !== 'LOGISTICS') {
                // Other roles shouldn't see these or see nothing unless specified
                return res.json([]);
            }

            sql += ` ORDER BY created_at DESC`;
            const r = await query(sql, params);
            res.json(r.rows);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    upsert: upsert('asset_requests'),
    remove: remove('asset_requests')
};
