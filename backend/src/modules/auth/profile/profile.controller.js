/**
 * GCM Profile Controller (Micro-Module)
 */
const { upsert } = require('../../../shared/controllers/crudController');

module.exports = {
    getProfile: (req, res) => res.json({ message: "Profile Fetch Logic TBD" }),
    updateProfile: upsert('users')
};
