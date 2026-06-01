/**
 * GCM Dashboard Reporting Controller (Micro-Module)
 */
const { getPing } = require('../../../shared/controllers/systemController'); // Leverages ping for health metrics

module.exports = {
    getStats: (req, res) => res.json({ status: "ok", dashboard: "General Reporting Stats" }),
    getHealth: getPing
};
