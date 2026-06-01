/**
 * GCM E-Commerce Store Controller (Public & Admin Module)
 */
const { upsert, list, remove, getById } = require('../../../shared/controllers/crudController');

module.exports = {
    // Environmental Equipments (Admin & Public)
    upsertEquipment: upsert('environmental_equipments'),
    listEquipments: list('environmental_equipments'),
    getEquipment: getById('environmental_equipments'),
    removeEquipment: remove('environmental_equipments'),
    incrementShareCount: async (req, res) => {
        try {
            const { id } = req.params;
            const { query } = require('../../../database');
            await query('UPDATE environmental_equipments SET share_count = share_count + 1 WHERE equipment_id = $1', [id]);
            res.json({ status: 'success' });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to increment share count' });
        }
    },

    // Equipment Inquiries (Admin & Public)
    submitInquiry: upsert('equipment_inquiries'),
    listInquiries: list('equipment_inquiries'),
    getInquiry: getById('equipment_inquiries'),
    removeInquiry: remove('equipment_inquiries')
};
