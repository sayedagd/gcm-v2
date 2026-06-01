/**
 * GCM Dynamic CRUD Controller — Enhanced with Bilingual Validation
 * [AR] المحرك المركزي — مع تحقق شامل ورسائل ثنائية اللغة
 */
const { query, transaction } = require('../../../database');
const { log } = require('../utils/logger');
const { logActivity } = require('../services/activityService');
const { PK_MAP } = require('../config/constants');
const { sanitizeForDB } = require('../utils/helpers');
const { UNIQUE_RULES, translatePgError, translateJoiErrors, duplicateEntity, serverError, deleteRestricted } = require('../utils/bilingualErrors');
const validators = require('../../../validators');

// [AR] خدمة البث اللحظي SSE — تبث التحديثات لكل الجداول المراقبة
const { publish } = require('../services/eventBus');

const TABLE_TO_PREFIX = {
    trips: 'trip',
    projects: 'project',
    companies: 'company',
    vehicles: 'vehicle',
    drivers: 'driver',
    suppliers: 'supplier',
    facilities: 'facility',
    asset_requests: 'asset_req',
    permission_requests: 'permission_req',
    project_services: 'project_service',
    notifications: 'notif',
    containers: 'inventory',
    tanks: 'inventory',
    scales: 'inventory',
    inventory_sizes: 'inventory',
};

const ACTION_TO_VERB = { CREATE: 'created', UPDATE: 'updated', DELETE: 'deleted' };

const broadcastChange = async (table, action, record) => {
    const prefix = TABLE_TO_PREFIX[table];
    if (!prefix) return; // table not realtime-tracked

    let event;
    if (table === 'notifications' && action === 'CREATE') {
        event = 'notif:new';
    } else {
        event = `${prefix}:${ACTION_TO_VERB[action]}`;
    }

    // Enrich trips with `_company_id` so CLIENT visibility filter works without extra lookup later
    if (table === 'trips' && record.project_id && !record._company_id) {
        try {
            const r = await query('SELECT company_id FROM projects WHERE project_id = $1', [record.project_id]);
            record._company_id = r.rows[0]?.company_id || null;
        } catch (_) { /* best-effort */ }
    }

    publish(event, record);
};

// [AR] Notification Services (Email & WhatsApp)
let emailService = { sendTripPendingReviewEmail: async () => {} };
let whatsappService = { sendTripPendingReviewWhatsApp: async () => {} };
try {
    emailService = require('../services/emailService');
    whatsappService = require('../services/whatsappService');
} catch (e) {
    console.error('[WARNING] Notification services failed to load in crudController', e);
}

let saveFileHierarchical = async () => null;
let saveEntityDoc = async () => null;
try {
    const fsService = require('../../../fileService.js');
    saveFileHierarchical = fsService.saveFileHierarchical;
    saveEntityDoc = fsService.saveEntityDoc;
} catch (e) {
    console.error("[WARNING] fileService.js failed to load in Controller.", e.message);
}

/**
 * [AR] تنقية النصوص من HTML/Script injection
 */
const stripHtml = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim();
};

/**
 * [AR] تنقية كل حقول الـ body من HTML
 */
const sanitizeBody = (data) => {
    const clean = {};
    for (const [key, val] of Object.entries(data)) {
        if (typeof val === 'string' && !key.endsWith('_file') && !key.endsWith('_url') && key !== 'proof_images' && key !== 'avatar' && key !== 'logo_url') {
            clean[key] = stripHtml(val);
        } else {
            clean[key] = val;
        }
    }
    return clean;
};

// ═══════════════════════════════════════════
// [AR] عرض البيانات (GET)
// ═══════════════════════════════════════════
const list = (table) => async (req, res) => {
    try {
        let whereClause = '';
        if (table === 'projects' || table === 'companies') {
            whereClause = " WHERE details != 'ARCHIVED' OR details IS NULL";
        } else if (table === 'users') {
            whereClause = " WHERE role != 'DEACTIVATED'";
        }

        const r = await query(`SELECT * FROM ${table}${whereClause} ORDER BY 1`);
        if (table === 'projects') {
            // [AR] تحسين الأداء: جلب الخدمات لكل المشاريع في استعلام واحد (JOIN) لمنع مشكلة N+1
            // [EN] Performance Optimization: Fetch services for all projects in one query via JOIN to prevent N+1 bottleneck
            const projectsSql = `
                SELECT 
                    p.*,
                    COALESCE(
                        (SELECT json_agg(service_id) FROM project_services ps WHERE ps.project_id = p.project_id),
                        '[]'::json
                    ) as service_ids
                FROM projects p
                ${whereClause}
                ORDER BY p.project_id
            `;
            const projectsRes = await query(projectsSql);

            const decorated = projectsRes.rows.map(p => ({
                ...p,
                service_ids: p.service_ids || [],
                assets: {
                    large_containers: p.assets_large_containers,
                    small_containers: p.assets_small_containers,
                    compactors: p.assets_compactors,
                    other_assets: p.assets_other
                }
            }));
            return res.json(decorated);
        }
        res.json(r.rows);
    } catch (e) {
        log(`[List Error] ${table}: ${e.message}`);
        const err = serverError();
        res.status(500).json(err);
    }
};

const getById = (table) => async (req, res) => {
    try {
        const pk = PK_MAP[table];
        const id = req.params.id;
        const r = await query(`SELECT * FROM ${table} WHERE "${pk}" = $1`, [id]);
        if (r.rows.length === 0) return res.status(404).json({ errorAr: 'غير موجود', errorEn: 'Not found' });
        res.json(r.rows[0]);
    } catch (e) {
        log(`[GetById Error] ${table}: ${e.message}`);
        res.status(500).json(serverError());
    }
};

// ═══════════════════════════════════════════
// [AR] إضافة أو تعديل (POST) — مع Validation + كشف التكرار
// ═══════════════════════════════════════════
const upsert = (table) => async (req, res) => {
    try {
        // --- 1. تنقية البيانات من HTML ---
        const data = sanitizeBody(req.body);
        const currentUser = req.user || {};
        const userId = data.user_id || currentUser.id || 'SYSTEM';

        // DEBUG: Log for project_services diagnostics
        if (table === 'project_services' || table === 'drivers') {
            console.log(`[UPSERT] Table: ${table}, Body:`, JSON.stringify(data));
        }

        // --- 2. التحقق من صحة البيانات (Joi Validation) ---
        const skipValidation = req.headers['x-skip-validation'] === 'true';
        if (validators[table] && !skipValidation) {
            const { error } = validators[table].validate(data, { abortEarly: false });
            if (error) {
                log(`[Validation Error] ${table}: ${error.details.map(d => d.message).join(', ')}`);
                const bilingualErrors = translateJoiErrors(error.details);
                // أول خطأ كرسالة رئيسية
                const first = bilingualErrors[0] || {};
                return res.status(400).json({
                    error: error.details[0].message,
                    errorAr: first.errorAr || 'بيانات غير صالحة',
                    errorEn: first.errorEn || 'Invalid data',
                    code: first.code || 'VALIDATION',
                    field: first.field,
                    allErrors: bilingualErrors,
                });
            }
        }

        const pk = PK_MAP[table];
        let id = data[pk];

        // [EN] Only auto-generate ID if it's not a SERIAL 'id' column or if explicitly needed
        // [AR] عدم توليد ID يدوي لو كان الحقل هو 'id' (تلقائي من الداتا بيز) مش موجود في الداتا
        const forceStringIdTables = ['contact_submissions', 'permission_requests', 'equipment_inquiries', 'project_services'];
        if (!id && (pk !== 'id' || forceStringIdTables.includes(table))) {
            // Use a descriptive, table-specific prefix for readability
            const prefixMap = {
                project_services: 'PS',
                contact_submissions: 'CS',
                permission_requests: 'PR',
                equipment_inquiries: 'EQ',
            };
            const prefix = prefixMap[table] || table.toUpperCase().slice(0, 4);
            id = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        }

        if (id) data[pk] = id;

        // --- 3. كشف التكرار (Duplicate Detection) ---
        const rule = UNIQUE_RULES[table];
        if (rule && data[rule.field]) {
            const exists = await query(`SELECT "${pk}" FROM ${table} WHERE "${pk}" = $1`, [id]);
            const isUpdate = exists.rows.length > 0;

            if (!isUpdate) {
                // فقط عند الإنشاء — نتحقق من التكرار
                let dupQuery = `SELECT "${pk}" FROM ${table} WHERE LOWER("${rule.column}") = LOWER($1)`;
                const dupParams = [data[rule.field]];

                // تكرار مع نطاق (مثلاً: اسم مشروع فريد داخل نفس الشركة)
                if (rule.scope && data[rule.scope]) {
                    dupQuery += ` AND "${rule.scope}" = $2`;
                    dupParams.push(data[rule.scope]);
                }

                const dupResult = await query(dupQuery, dupParams);
                if (dupResult.rows.length > 0) {
                    const dupErr = duplicateEntity(table, data[rule.field]);
                    return res.status(409).json(dupErr);
                }
            } else {
                // عند التعديل — نتحقق من التكرار مع استبعاد السجل الحالي
                let dupQuery = `SELECT "${pk}" FROM ${table} WHERE LOWER("${rule.column}") = LOWER($1) AND "${pk}" != $2`;
                const dupParams = [data[rule.field], id];

                if (rule.scope && data[rule.scope]) {
                    dupQuery += ` AND "${rule.scope}" = $3`;
                    dupParams.push(data[rule.scope]);
                }

                const dupResult = await query(dupQuery, dupParams);
                if (dupResult.rows.length > 0) {
                    const dupErr = duplicateEntity(table, data[rule.field]);
                    return res.status(409).json(dupErr);
                }
            }
        }

        // --- 4. معالجة الملفات (Trips) ---
        if (table === 'trips') {
            if (!data.receipt_no) {
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                data.receipt_no = `RCPT-${dateStr}-${randomSuffix}`;
            }

            // [PERF] Run project + service queries in parallel (they're independent)
            const [projResult, servResult] = await Promise.all([
                query('SELECT * FROM projects WHERE project_id = $1', [data.project_id]),
                data.service_id ? query('SELECT * FROM services WHERE service_id = $1', [data.service_id]) : Promise.resolve({ rows: [] })
            ]);
            const project = projResult.rows[0] || {};
            const service = servResult.rows[0] || {};
            // Company depends on project.company_id, so it runs after
            const comp = project.company_id ? (await query('SELECT * FROM companies WHERE company_id = $1', [project.company_id])).rows[0] : null;
            const company = comp || {};

            const dateObj = data.date ? new Date(data.date) : new Date();
            const fileCtx = { companyName: company.company_name, projectName: project.project_name, serviceName: service.service_name, date: dateObj };

            // [PERF] Run file saves in parallel (they're independent)
            const [manifestPath, dnPath, recyclePath] = await Promise.all([
                (data.manifest_file && data.manifest_file.startsWith('data:')) ? saveFileHierarchical({ base64Data: data.manifest_file, ...fileCtx, fileName: 'Manifest' }) : Promise.resolve(data.manifest_file),
                (data.delivery_note_file && data.delivery_note_file.startsWith('data:')) ? saveFileHierarchical({ base64Data: data.delivery_note_file, ...fileCtx, fileName: 'DN' }) : Promise.resolve(data.delivery_note_file),
                (data.recycle_file && data.recycle_file.startsWith('data:')) ? saveFileHierarchical({ base64Data: data.recycle_file, ...fileCtx, fileName: 'Recycle' }) : Promise.resolve(data.recycle_file)
            ]);
            data.manifest_file = manifestPath;
            data.delivery_note_file = dnPath;
            data.recycle_file = recyclePath;

            if (data.proof_images) {
                const proofs = typeof data.proof_images === 'string' ? JSON.parse(data.proof_images) : data.proof_images;
                if (Array.isArray(proofs)) {
                    const savedPaths = await Promise.all(proofs.map((img, i) => saveFileHierarchical({ base64Data: img, companyName: company.company_name, projectName: project.project_name, serviceName: service.service_name, date: dateObj, fileName: `Proof_${i}` })));
                    data.proof_images = JSON.stringify(savedPaths.filter(p => p !== null));
                }
            }
        } else if (['companies', 'projects', 'suppliers', 'drivers', 'vehicles', 'users', 'containers', 'tanks', 'facilities'].includes(table)) {
            const entityName = data.name || data.company_name || data.project_name || data.plate_no || data.code || data.email;
            const entityType = table.endsWith('s') ? table.slice(0, -1) : table;

            const fileFields = {
                companies: ['logo_url', 'cr_file', 'vat_file', 'national_address_file'],
                projects: ['logo_url', 'po_file'],
                suppliers: ['cr_file', 'tax_file', 'contract_file'],
                drivers: ['license_file', 'iqama_file', 'operating_card_file', 'insurance_file'],
                vehicles: ['photo_front', 'photo_back'],
                users: ['avatar'],
                containers: ['doc_file'],
                tanks: ['doc_file'],
                scales: ['doc_file'],
                facilities: ['contract_file']
            }[table] || [];

            for (const field of fileFields) {
                if (data[field] && data[field].startsWith('data:')) {
                    data[field] = await saveEntityDoc(entityType, entityName, field, data[field]);
                }
            }

            if (data.permit_zones) {
                try {
                    let permits = typeof data.permit_zones === 'string' ? JSON.parse(data.permit_zones) : data.permit_zones;
                    if (Array.isArray(permits)) {
                        let changed = false;
                        for (let p of permits) {
                            if (p.fileData && p.fileData.startsWith('data:')) {
                                p.fileData = await saveEntityDoc(entityType, entityName, p.fileName || 'permit', p.fileData);
                                changed = true;
                            }
                        }
                        if (changed) data.permit_zones = JSON.stringify(permits);
                    }
                } catch (e) {
                    console.error('[Permit Interception Error]', e);
                }
            }
        }

        // --- 4.5. [EN] User Existence Guard for Notifications/Activity ---
        // [AR] التحقق من وجود المستخدم قبل الإضافة لتجنب أخطاء المفتاح الخارجي
        if (table === 'notifications' && data.user_id) {
            const userCheck = await query('SELECT 1 FROM users WHERE id = $1', [data.user_id]);
            if (userCheck.rows.length === 0) {
                // If user doesn't exist, we can't create the notification
                log(`[CRITICAL] Cannot create notification: User ${data.user_id} not found.`);
                return res.status(400).json({ errorAr: 'المستخدم غير موجود', errorEn: 'User not found', code: 'FK_VIOLATION' });
            }
        }

        // --- 4.6. Auto-compute total_cost for project_services ---
        if (table === 'project_services') {
            const qty = parseFloat(data.quantity) || 0;
            const price = parseFloat(data.unit_price) || 0;
            data.total_cost = qty * price;
        }

        // --- 5. حفظ في قاعدة البيانات ---
        const dbData = sanitizeForDB(table, data);
        if (id) dbData[pk] = id; // [AR] لا نضع الـ id لو كان undefined عشان الـ SERIAL

        const oldRecord = id ? (await query(`SELECT * FROM ${table} WHERE "${pk}" = $1`, [id])).rows[0] : null;
        const exists = !!oldRecord;
        const action = exists ? 'UPDATE' : 'CREATE';
        const cols = Object.keys(dbData);
        let result;

        if (exists) {
            // Partial Update
            const updateCols = cols.filter(c => c !== pk);
            if (updateCols.length > 0) {
                const setClause = updateCols.map((c, i) => `"${c}" = $${i + 2}`).join(', ');
                const sql = `UPDATE ${table} SET ${setClause} WHERE "${pk}" = $1 RETURNING *`;
                result = await query(sql, [id, ...updateCols.map(c => dbData[c])]);
            } else {
                // Nothing to update, just return the existing record
                result = await query(`SELECT * FROM ${table} WHERE "${pk}" = $1`, [id]);
            }
        } else {
            // Create New
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
            const sql = `INSERT INTO ${table} (${cols.map(c => `"${c}"`).join(', ')}) 
                         VALUES (${placeholders}) 
                         RETURNING *`;
            result = await query(sql, cols.map(c => dbData[c]));
        }
        const finalRecord = result.rows[0];
        const finalId = finalRecord[pk];

        const finalName = data.name || data.company_name || data.project_name || data.plate_no || data.code || data.email || finalId;
        const finalType = table.endsWith('s') ? table.slice(0, -1).toUpperCase() : table.toUpperCase();
        await logActivity(action, finalType, finalId, finalName, userId, `Via API`);

        res.json({ status: 'success', id: finalId, ...finalRecord });

        // [AR] بث لحظي لكل الجداول المراقبة — SSE
        broadcastChange(table, action, finalRecord);

        // Trigger Notifications if trip status changed to PENDING_REVIEW
        if (table === 'trips' && finalRecord.status === 'PENDING_REVIEW' && (!oldRecord || oldRecord.status !== 'PENDING_REVIEW')) {
            // Fire-and-Forget: Don't await these so we don't block the API response
            (async () => {
                try {
                    const proj = finalRecord.project_id ? (await query('SELECT * FROM projects WHERE project_id = $1', [finalRecord.project_id])).rows[0] : null;
                    const comp = proj && proj.company_id ? (await query('SELECT * FROM companies WHERE company_id = $1', [proj.company_id])).rows[0] : null;
                    
                    if (comp) {
                        // Send Email
                        if (comp.contact_email) {
                            await emailService.sendTripPendingReviewEmail(finalRecord, comp.contact_email, proj, comp);
                        }
                        // Send WhatsApp
                        if (comp.contact_phone) {
                            await whatsappService.sendTripPendingReviewWhatsApp(finalRecord, comp.contact_phone, proj, comp);
                        }
                    }
                } catch (err) {
                    console.error('[Notification Error in Background]', err);
                }
            })();
        }
    } catch (e) {
        log(`API Error (${table}): ${e.message} | Stack: ${e.stack}`);

        // --- ترجمة أخطاء PostgreSQL ---
        if (e.code && (e.code.startsWith('23') || e.code.startsWith('22'))) {
            const pgErr = translatePgError(e, table);
            const statusCode = e.code === '23505' ? 409 : 400;
            return res.status(statusCode).json(pgErr);
        }

        // [AR] إخفاء تفاصيل الأخطاء في الإنتاج — [EN] Hide error details in production
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            ...serverError(),
            ...(isDev ? { error: e.message, detail: e.detail, pgCode: e.code, column: e.column, table: e.table } : {}),
        });
    }
};

// ═══════════════════════════════════════════
// [AR] حذف (DELETE) — مع حماية من الحذف لو مرتبط ببيانات
// ═══════════════════════════════════════════
const remove = (table) => async (req, res) => {
    try {
        const pk = PK_MAP[table];
        const id = req.params.id;

        // --- حماية من الحذف لو فيه بيانات مرتبطة ---
        const FK_DEPS = {
            companies: [{ table: 'projects', column: 'company_id', name: 'projects' }],
            projects: [{ table: 'trips', column: 'project_id', name: 'trips' }, { table: 'project_services', column: 'project_id', name: 'project_services' }],
            services: [{ table: 'trips', column: 'service_id', name: 'trips' }, { table: 'project_services', column: 'service_id', name: 'project_services' }],
            vehicles: [{ table: 'trips', column: 'vehicle_id', name: 'trips' }],
            drivers: [{ table: 'trips', column: 'driver_id', name: 'trips' }],
            facilities: [{ table: 'trips', column: 'facility_id', name: 'trips' }],
        };

        const deps = FK_DEPS[table];
        if (deps) {
            for (const dep of deps) {
                const count = (await query(`SELECT COUNT(*) FROM ${dep.table} WHERE "${dep.column}" = $1`, [id])).rows[0].count;
                if (parseInt(count) > 0) {
                    const err = deleteRestricted(table, dep.name);
                    return res.status(409).json(err);
                }
            }
        }

        await query(`DELETE FROM ${table} WHERE "${pk}" = $1`, [id]);

        const entityType = table.endsWith('s') ? table.slice(0, -1).toUpperCase() : table.toUpperCase();
        await logActivity('DELETE', entityType, id, 'Deleted Entity', 'SYSTEM', 'Via API');

        res.json({ status: 'deleted' });

        // [AR] بث لحظي عند الحذف — SSE
        broadcastChange(table, 'DELETE', { [pk]: id });
    } catch (e) {
        if (e.code && e.code.startsWith('23')) {
            const pgErr = translatePgError(e, table);
            return res.status(409).json(pgErr);
        }
        const err = serverError();
        res.status(500).json(err);
    }
};

// ═══════════════════════════════════════════
// [AR] حذف الشركات (مع Soft Delete Fallback)
// ═══════════════════════════════════════════
const deleteCompany = async (req, res) => {
    const id = req.params.id;
    try {
        log(`[Company Deletion] Starting atomic cleanup: ${id}`);
        await transaction(async (client) => {
            await client.query('DELETE FROM activity_logs WHERE entity_id = $1 AND entity_type = \'COMPANY\'', [id]);
            await client.query('DELETE FROM companies WHERE company_id = $1', [id]);
        });
        log(`[Company Deletion] Hard delete successful: ${id}`);
        await logActivity('DELETE', 'COMPANY', id, 'Deleted Company', 'SYSTEM', 'Hard Delete');
        res.json({ status: 'deleted' });
    } catch (e) {
        log(`[Company Deletion] Hard delete failed (${e.message}). Attempting Soft Delete...`);
        try {
            const suffix = `_del_${Date.now()}`;
            await query('UPDATE companies SET company_name = company_name || $2, details = $3 WHERE company_id = $1',
                [id, suffix, 'ARCHIVED']);
            await logActivity('DELETE', 'COMPANY', id, 'Archived Company', 'SYSTEM', 'Soft Delete');
            res.json({ status: 'deleted' });
        } catch (softErr) {
            log(`[Company Deletion] CRITICAL FAILURE: ${softErr.message}`);
            res.status(500).json(serverError());
        }
    }
};

const deleteProject = async (req, res) => {
    const id = req.params.id;
    try {
        log(`[Project Deletion] Starting atomic cleanup: ${id}`);
        await transaction(async (client) => {
            await client.query('DELETE FROM project_services WHERE project_id = $1', [id]);
            await client.query('DELETE FROM projects WHERE project_id = $1', [id]);
        });
        log(`[Project Deletion] Hard delete successful: ${id}`);
        await logActivity('DELETE', 'PROJECT', id, 'Deleted Project', 'SYSTEM', 'Hard Delete');
        res.json({ status: 'deleted' });
    } catch (e) {
        log(`[Project Deletion] Hard delete failed (${e.message}). Attempting Soft Delete...`);
        try {
            const suffix = `_del_${Date.now()}`;
            await query('UPDATE projects SET project_name = project_name || $2, details = $3 WHERE project_id = $1',
                [id, suffix, 'ARCHIVED']);
            await logActivity('DELETE', 'PROJECT', id, 'Archived Project', 'SYSTEM', 'Soft Delete');
            res.json({ status: 'deleted' });
        } catch (softErr) {
            res.status(500).json(serverError());
        }
    }
};

const deleteUser = async (req, res) => {
    const userId = req.params.id;
    try {
        log(`[User Deletion] Starting atomic cleanup for user: ${userId}`);
        await transaction(async (client) => {
            await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM activity_logs WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM permission_requests WHERE email = (SELECT email FROM users WHERE id = $1)', [userId]);
            await client.query('DELETE FROM users WHERE id = $1', [userId]);
        });
        log(`[User Deletion] Hard delete successful: ${userId}`);
        await logActivity('DELETE', 'USER', userId, 'Deleted User', 'SYSTEM', 'Hard Delete');
        res.json({ status: 'deleted' });
    } catch (e) {
        log(`[User Deletion] Hard delete failed (${e.message}). Attempting Soft Delete...`);
        try {
            const suffix = `_del_${Date.now()}`;
            await query(`
                UPDATE users 
                SET role = 'DEACTIVATED', 
                    email = email || $2, 
                    password = 'DELETED_USER_ACCESS_REVOKED' 
                WHERE id = $1
            `, [userId, suffix]);
            log(`[User Deletion] Soft delete (Deactivation) successful: ${userId}`);
            await logActivity('DELETE', 'USER', userId, 'Deactivated User', 'SYSTEM', 'Soft Delete');
            res.json({ status: 'deleted' });
        } catch (softErr) {
            log(`[User Deletion] CRITICAL FAILURE: ${softErr.message}`);
            res.status(500).json(serverError());
        }
    }
};

module.exports = {
    list,
    upsert,
    remove,
    getById,
    deleteCompany,
    deleteProject,
    deleteUser
};
