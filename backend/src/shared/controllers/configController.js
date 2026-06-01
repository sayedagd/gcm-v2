/**
 * GCM SaaS Configuration Controller
 */
const { query } = require('../../../database');
const { log } = require('../utils/logger');
const { sanitizeForDB, deepMerge } = require('../utils/helpers');
const { DEFAULT_SaaS_CONFIG } = require('../config/constants');

const getConfig = async (req, res) => {
    log('[API] Get Config request');
    try {
        const r = await query('SELECT * FROM saas_config WHERE id = \'SINGLETON\'');
        const dbConfig = r.rows[0] || {};
        const configToMerge = {
            app_name_ar: dbConfig.app_name_ar,
            app_name_en: dbConfig.app_name_en,
            app_slogan_ar: dbConfig.app_slogan_ar,
            app_slogan_en: dbConfig.app_slogan_en,
            primary_color: dbConfig.primary_color,
            logo_url: dbConfig.logo_url,
            logo_dark_url: dbConfig.logo_dark_url,
            language: dbConfig.language,
            template_config: typeof dbConfig.template_config === 'string' ? JSON.parse(dbConfig.template_config) : dbConfig.template_config,
            ai_assistant: typeof dbConfig.ai_assistant === 'string' ? JSON.parse(dbConfig.ai_assistant) : dbConfig.ai_assistant,
            boot_config: typeof dbConfig.boot_config === 'string' ? JSON.parse(dbConfig.boot_config) : dbConfig.boot_config,
            management_controls_enabled: dbConfig.management_controls_enabled,
            landing_page: typeof dbConfig.landing_page === 'string' ? JSON.parse(dbConfig.landing_page) : (dbConfig.landing_page || {}),
            store_page: typeof dbConfig.store_page === 'string' ? JSON.parse(dbConfig.store_page) : (dbConfig.store_page || {}),
            support_phone: dbConfig.support_phone,
            support_whatsapp: dbConfig.support_whatsapp
        };
        res.json(deepMerge(DEFAULT_SaaS_CONFIG, configToMerge));
    } catch (e) {
        log(`[API] Config fetch error: ${e.message}`);
        res.json(DEFAULT_SaaS_CONFIG);
    }
};

const updateConfig = async (req, res) => {
    log('[API] Update Config request');
    try {
        const dbData = sanitizeForDB('saas_config', req.body);
        const cols = Object.keys(dbData).filter(c => c !== 'id');
        const setClause = cols.map((cl, i) => `"${cl}" = $${i + 1}`).join(', ');
        await query(`UPDATE saas_config SET ${setClause} WHERE id = 'SINGLETON'`, cols.map(c => dbData[c]));
        res.json({ status: 'updated' });
    } catch (e) {
        log(`Config Error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getConfig,
    updateConfig
};
