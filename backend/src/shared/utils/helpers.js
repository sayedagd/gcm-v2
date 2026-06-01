/**
 * GCM Backend Helpers
 * [camelToSnake], [sanitizeForDB], [deepMerge]
 */
const { SCHEMA } = require('../config/constants');

const camelToSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const deepMerge = (t, s) => {
    const o = { ...t };
    if (s && typeof s === 'object' && !Array.isArray(s)) {
        Object.keys(s).forEach(k => {
            if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) o[k] = deepMerge(t[k] || {}, s[k]);
            else if (s[k] !== undefined && s[k] !== null) o[k] = s[k];
        });
    }
    return o;
};

const sanitizeForDB = (table, data) => {
    const result = {};
    const validCols = SCHEMA[table] || [];

    // Flat clones to avoid mutating original
    const cleanData = { ...data };

    // Flatten Project Assets
    if (table === 'projects' && cleanData.assets) {
        cleanData.assets_large_containers = cleanData.assets.large_containers;
        cleanData.assets_small_containers = cleanData.assets.small_containers;
        cleanData.assets_compactors = cleanData.assets.compactors;
        cleanData.assets_other = cleanData.assets.other_assets;
    }

    // Special Mappings
    if (table === 'notifications' && cleanData.isRead !== undefined) cleanData.read = cleanData.isRead;
    if (table === 'permission_requests' && cleanData.fromLocation !== undefined) cleanData.from_location = cleanData.fromLocation;

    // [AR] تحويل أسماء حقول الموردين — الفرونت يستخدم أسماء مختلفة عن الداتابيز
    // [EN] Supplier field name mapping — Frontend uses different names than DB
    if (table === 'suppliers') {
        if (cleanData.cr_no !== undefined && cleanData.license_no === undefined) cleanData.license_no = cleanData.cr_no;
        if (cleanData.cr_file !== undefined && cleanData.license_file === undefined) cleanData.license_file = cleanData.cr_file;
        if (cleanData.tax_no !== undefined && cleanData.vat_no === undefined) cleanData.vat_no = cleanData.tax_no;
        if (cleanData.tax_file !== undefined && cleanData.vat_file === undefined) cleanData.vat_file = cleanData.tax_file;
        if (cleanData.contract_file !== undefined && cleanData.agreement_file === undefined) cleanData.agreement_file = cleanData.contract_file;
        if (cleanData.contact_person !== undefined && cleanData.contact_persons === undefined) cleanData.contact_persons = cleanData.contact_person;
        if (cleanData.contact_persons !== undefined && cleanData.contact_person === undefined) cleanData.contact_person = cleanData.contact_persons;
        if (cleanData.trading_name !== undefined && cleanData.details === undefined) cleanData.details = cleanData.trading_name;

        // [AR] تحويل مصفوفات التعيينات لـ JSON
        // [EN] Serialize array assignments to JSON
        if (cleanData.assigned_projects && typeof cleanData.assigned_projects !== 'string') cleanData.assigned_projects = JSON.stringify(cleanData.assigned_projects);
        if (cleanData.assigned_services && typeof cleanData.assigned_services !== 'string') cleanData.assigned_services = JSON.stringify(cleanData.assigned_services);
    }

    // [AR] تحويل مصفوفات المركبات لـ JSON
    // [EN] Serialize vehicle arrays to JSON
    if (table === 'vehicles') {
        if (cleanData.documents && typeof cleanData.documents !== 'string') cleanData.documents = JSON.stringify(cleanData.documents);
        if (cleanData.permit_zones && typeof cleanData.permit_zones !== 'string') cleanData.permit_zones = JSON.stringify(cleanData.permit_zones);
    }
    if (table === 'drivers') {
        if (cleanData.permit_zones && typeof cleanData.permit_zones !== 'string') cleanData.permit_zones = JSON.stringify(cleanData.permit_zones);
    }

    Object.keys(cleanData).forEach(k => {
        const snakeKey = camelToSnake(k);
        if (validCols.includes(snakeKey)) {
            let val = cleanData[k];

            // [AR] تحويل الكائنات والمصفوفات إلى JSON مخزن نصياً
            const jsonCols = ['accepted_services', 'contact_persons', 'landing_page', 'store_page', 'preferences', 'trip_data_summary', 'maintenance_logs', 'template_config', 'ai_assistant', 'boot_config'];
            if (val !== null && typeof val === 'object' && jsonCols.includes(snakeKey)) {
                val = JSON.stringify(val);
            }

            // [AR] معالجة التواريخ الفارغة والمعرفات والقيم المشوهة لمنع أخطاء التنسيق والقيود
            // [EN] Handle empty dates, IDs, and malformed strings (like "undefined") to prevent constraint violations
            if ((val === '' || val === 'undefined' || val === 'null') && (
                snakeKey.endsWith('_date') ||
                snakeKey.endsWith('_at') ||
                snakeKey.endsWith('_expiry') ||
                snakeKey.endsWith('_id') ||
                ['contract_start', 'contract_end', 'date', 'last_login'].includes(snakeKey)
            )) {
                val = null;
            }

            // [AR] تحويل الأنواع — string لـ boolean
            if (val === 'true') val = true;
            if (val === 'false') val = false;

            result[snakeKey] = val;
        }
    });
    return result;
};

module.exports = {
    camelToSnake,
    deepMerge,
    sanitizeForDB
};
