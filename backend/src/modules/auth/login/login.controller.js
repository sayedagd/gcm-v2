/**
 * GCM Login Controller (Micro-Module)
 */
const { query } = require('../../../../database');
const { log } = require('../../../shared/utils/logger');
const jwt = require('jsonwebtoken');

// Helper to generate JWT
const generateToken = (id, role, company_id, project_id, supplier_id) => {
    return jwt.sign(
        { id, role, company_id, project_id, supplier_id },
        process.env.JWT_SECRET || 'gcm_super_secret_jwt_key_2026',
        { expiresIn: '30d' }
    );
};

const login = async (req, res) => {
    const { email, password } = req.body;
    log(`[Auth/Login] Attempt: ${email}`);
    try {
        const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (rows.length > 0) {
            const u = rows[0];
            // PLAIN TEXT MATCH (requested for debugging)
            const match = (password === u.password);

            if (match) {
                log(`[Auth/Login] Success: ${email}`);
                const safe = { ...u };
                delete safe.password;

                // [HEAL] If role is DRIVER, ensure they are linked to a driver record or create one
                if (u.role === 'DRIVER') {
                    try {
                        // 1. Try to link this user ID to a driver record in drivers table if not already linked
                        await query(`
                            UPDATE drivers 
                            SET user_id = $1 
                            WHERE user_id IS NULL 
                              AND (
                                LOWER(name) = LOWER($2) 
                                OR LOWER(name) = LOWER(SPLIT_PART($3, '@', 1))
                              )
                        `, [u.id, u.name || '', u.email]);

                        // 2. Check if a driver record now exists for this user ID
                        const { rows: driverRows } = await query('SELECT driver_id FROM drivers WHERE user_id = $1', [u.id]);
                        if (driverRows.length === 0) {
                            // Create a driver record for them
                            const driverId = `D-${Date.now()}`;
                            await query(`
                                INSERT INTO drivers (driver_id, name, status, ownership_type, user_id)
                                VALUES ($1, $2, 'ACTIVE', 'INTERNAL', $3)
                            `, [driverId, u.name || email.split('@')[0], u.id]);
                            log(`[Auth/Login] Created driver record ${driverId} for user ${u.id}`);
                        }
                    } catch (healErr) {
                        console.error('[Auth/Login] Self-healing driver record link/creation failed:', healErr.message);
                    }
                }

                // Attach JWT to the response
                safe.token = generateToken(u.id, u.role, u.company_id, u.project_id, u.supplier_id);

                return res.json(safe);
            }
        }
        log(`[Auth/Login] Failed (401): ${email}`);
        res.status(401).json({ error: 'Auth Failed' });
    } catch (e) {
        log(`[Auth/Login Error] ${email}: ${e.message}`);
        res.status(500).json({ error: e.message, details: 'Check backend logs' });
    }
};

module.exports = {
    login
};
