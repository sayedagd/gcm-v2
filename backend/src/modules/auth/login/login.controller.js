/**
 * GCM Login Controller (Micro-Module)
 */
const { log } = require('../../../shared/utils/logger');
const jwt = require('jsonwebtoken');

let query = null;
const getQuery = () => {
    if (query) {
        return query;
    }

    try {
        query = require('../../../../database').query;
        return query;
    } catch (error) {
        return null;
    }
};

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'gcm_jwt';

const buildCookieOptions = (maxAgeMs) => {
    const sameSiteRaw = (process.env.AUTH_COOKIE_SAMESITE || 'lax').toLowerCase();
    const sameSite = ['lax', 'strict', 'none'].includes(sameSiteRaw) ? sameSiteRaw : 'lax';
    const secure = process.env.AUTH_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production' || sameSite === 'none';

    return {
        httpOnly: true,
        secure,
        sameSite,
        path: '/',
        maxAge: maxAgeMs,
    };
};

const issueAuthToken = ({ id, role, company_id, project_id, supplier_id }) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET is not configured');
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '12h';
    const token = jwt.sign(
        { id, role, company_id, project_id, supplier_id },
        jwtSecret,
        { expiresIn }
    );

    const decoded = jwt.decode(token) || {};
    const expiresAt = typeof decoded.exp === 'number' ? decoded.exp : null;
    const issuedAt = typeof decoded.iat === 'number' ? decoded.iat : null;
    const maxAgeSeconds = expiresAt && issuedAt ? Math.max(1, expiresAt - issuedAt) : null;
    const maxAgeMs = maxAgeSeconds ? maxAgeSeconds * 1000 : undefined;

    return {
        token,
        expiresAt,
        expiresInSeconds: maxAgeSeconds,
        cookieOptions: buildCookieOptions(maxAgeMs),
    };
};

const login = async (req, res) => {
    const { email, password } = req.body;
    log(`[Auth/Login] Attempt: ${email}`);
    try {
        const dbQuery = getQuery();
        if (!dbQuery) {
            log(`[Auth/Login] Database unavailable, rejecting attempt: ${email}`);
            return res.status(401).json({ error: 'Auth Failed' });
        }

        const { rows } = await dbQuery('SELECT * FROM users WHERE email = $1', [email]);
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
                        await dbQuery(`
                            UPDATE drivers 
                            SET user_id = $1 
                            WHERE user_id IS NULL 
                              AND (
                                LOWER(name) = LOWER($2) 
                                OR LOWER(name) = LOWER(SPLIT_PART($3, '@', 1))
                              )
                        `, [u.id, u.name || '', u.email]);

                        // 2. Check if a driver record now exists for this user ID
                        const { rows: driverRows } = await dbQuery('SELECT driver_id FROM drivers WHERE user_id = $1', [u.id]);
                        if (driverRows.length === 0) {
                            // Create a driver record for them
                            const driverId = `D-${Date.now()}`;
                            await dbQuery(`
                                INSERT INTO drivers (driver_id, name, status, ownership_type, user_id)
                                VALUES ($1, $2, 'ACTIVE', 'INTERNAL', $3)
                            `, [driverId, u.name || email.split('@')[0], u.id]);
                            log(`[Auth/Login] Created driver record ${driverId} for user ${u.id}`);
                        }
                    } catch (healErr) {
                        console.error('[Auth/Login] Self-healing driver record link/creation failed:', healErr.message);
                    }
                }

                const authToken = issueAuthToken({
                    id: u.id,
                    role: u.role,
                    company_id: u.company_id,
                    project_id: u.project_id,
                    supplier_id: u.supplier_id,
                });

                res.cookie(COOKIE_NAME, authToken.token, authToken.cookieOptions);

                // Keep token in payload for legacy clients until they migrate to HttpOnly cookie mode.
                safe.token = authToken.token;
                safe.tokenExpiresAt = authToken.expiresAt;
                safe.tokenExpiresInSeconds = authToken.expiresInSeconds;

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

const logout = async (req, res) => {
    const sameSiteRaw = (process.env.AUTH_COOKIE_SAMESITE || 'lax').toLowerCase();
    const sameSite = ['lax', 'strict', 'none'].includes(sameSiteRaw) ? sameSiteRaw : 'lax';
    const secure = process.env.AUTH_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production' || sameSite === 'none';

    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure,
        sameSite,
        path: '/',
    });

    return res.json({ status: 'success' });
};

module.exports = {
    login,
    logout
};
