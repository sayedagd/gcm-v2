/**
 * GCM SaaS Configuration Controller
 */
const { query } = require('../../../database');
const { log } = require('../utils/logger');
const { sanitizeForDB, deepMerge } = require('../utils/helpers');
const { DEFAULT_SaaS_CONFIG } = require('../config/constants');

const CONFIG_CACHE_TTL_MS = Number(process.env.CONFIG_CACHE_TTL_MS || 15000);
let cachedConfig = null;
let cacheExpiresAt = 0;

const getCachedConfig = () => {
    if (!cachedConfig) {
        return null;
    }

    if (Date.now() >= cacheExpiresAt) {
        cachedConfig = null;
        cacheExpiresAt = 0;
        return null;
    }

    return cachedConfig;
};

const setCachedConfig = (config) => {
    cachedConfig = config;
    cacheExpiresAt = Date.now() + CONFIG_CACHE_TTL_MS;
};

const invalidateConfigCache = () => {
    cachedConfig = null;
    cacheExpiresAt = 0;
};

const parseJSONField = (value, fallback) => {
    if (typeof value !== 'string') {
        return value ?? fallback;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const getConfig = async (req, res) => {
    log('[API] Get Config request');

    const cached = getCachedConfig();
    if (cached) {
        return res.json(cached);
    }

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
            template_config: parseJSONField(dbConfig.template_config, {}),
            ai_assistant: parseJSONField(dbConfig.ai_assistant, {}),
            boot_config: parseJSONField(dbConfig.boot_config, {}),
            management_controls_enabled: dbConfig.management_controls_enabled,
            landing_page: parseJSONField(dbConfig.landing_page, {}),
            store_page: parseJSONField(dbConfig.store_page, {}),
            support_phone: dbConfig.support_phone,
            support_whatsapp: dbConfig.support_whatsapp
        };

        const mergedConfig = deepMerge(DEFAULT_SaaS_CONFIG, configToMerge);
        setCachedConfig(mergedConfig);
        return res.json(mergedConfig);
    } catch (e) {
        log(`[API] Config fetch error: ${e.message}`);
        return res.json(DEFAULT_SaaS_CONFIG);
    }
};

const updateConfig = async (req, res) => {
    log('[API] Update Config request');
    try {
        const dbData = sanitizeForDB('saas_config', req.body);
        const cols = Object.keys(dbData).filter(c => c !== 'id');
        const setClause = cols.map((cl, i) => `"${cl}" = $${i + 1}`).join(', ');
        await query(`UPDATE saas_config SET ${setClause} WHERE id = 'SINGLETON'`, cols.map(c => dbData[c]));
        invalidateConfigCache();
        res.json({ status: 'updated' });
    } catch (e) {
        log(`Config Error: ${e.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getConfig,
    updateConfig
};
