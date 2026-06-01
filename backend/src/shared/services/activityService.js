/**
 * GCM Activity Logging Service
 */
const { query } = require('../../../database');

const logActivity = async (action, entityType, entityId, entityName, userId = 'SYSTEM', details = '') => {
    try {
        const id = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // [AR] التحقق من وجود المستخدم لتجنب أخطاء المفتاح الخارجي
        // [EN] Check if user exists to avoid FK errors
        let finalUserId = userId;
        const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId]);
        
        if (userCheck.rows.length === 0) {
            // [AR] إذا لم يوجد المستخدم، نحاول استخدام النظام (SYSTEM) أو نترك الحقل فارغاً
            // [EN] If user doesn't exist, try falling back to 'SYSTEM' if it exists, otherwise NULL
            const systemCheck = await query("SELECT id FROM users WHERE id = 'SYSTEM'");
            finalUserId = systemCheck.rows.length > 0 ? 'SYSTEM' : null;
            
            // Log that we fell back
            console.warn(`[Activity Log] User ${userId} not found, falling back to ${finalUserId || 'NULL'}`);
        }

        await query(
            `INSERT INTO activity_logs (id, action, entity_type, entity_id, entity_name, details, timestamp, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, action, entityType, entityId, entityName, details, new Date().toISOString(), finalUserId]
        );
    } catch (e) {
        console.error('[Activity Log Error]', e.message);
    }
};

module.exports = {
    logActivity
};
