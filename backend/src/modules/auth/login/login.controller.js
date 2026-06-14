/**
 * GCM Login Controller (Micro-Module)
 */
const { log } = require('../../../shared/utils/logger');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { getJwtSecret } = require('../../../shared/config/auth');
const { buildValidationError } = require('../../../shared/utils/validationErrorContract');

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
const CSRF_COOKIE_NAME = process.env.AUTH_CSRF_COOKIE_NAME || 'gcm_csrf';
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;
const getEnvValue = (key) => {
    const value = process.env[key];
    return typeof value === 'string' ? value.trim() : value;
};
const loginPayloadSchema = Joi.object({
    email: Joi.string().email({ tlds: false }).required(),
    password: Joi.string().min(1).required(),
}).unknown(false);

const isBcryptHash = (value) => typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value);

const verifyPassword = async (providedPassword, storedPassword) => {
    if (typeof providedPassword !== 'string' || typeof storedPassword !== 'string') {
        return false;
    }

    if (isBcryptHash(storedPassword)) {
        return bcrypt.compare(providedPassword, storedPassword);
    }

    if (process.env.ALLOW_LEGACY_PASSWORD_FALLBACK === 'false') {
        return false;
    }

    return providedPassword === storedPassword;
};

const hashPassword = async (password) => {
    const rounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    return bcrypt.hash(password, rounds);
};

const buildCookieOptions = (maxAgeMs) => {
    const sameSiteRaw = (getEnvValue('AUTH_COOKIE_SAMESITE') || 'lax').toLowerCase();
    const sameSite = ['lax', 'strict', 'none'].includes(sameSiteRaw) ? sameSiteRaw : 'lax';
    const secure = getEnvValue('AUTH_COOKIE_SECURE') === 'true' || process.env.NODE_ENV === 'production' || sameSite === 'none';

    return {
        httpOnly: true,
        secure,
        sameSite,
        path: '/',
        maxAge: maxAgeMs,
    };
};

const buildCsrfCookieOptions = (maxAgeMs) => {
    const baseOptions = buildCookieOptions(maxAgeMs);
    return {
        ...baseOptions,
        httpOnly: false,
    };
};

const issueAuthToken = ({ id, role, company_id, project_id, supplier_id }) => {
    const jwtSecret = getJwtSecret();
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
    const { error, value } = loginPayloadSchema.validate(req.body || {});
    if (error) {
        return res.status(400).json(buildValidationError({
            code: 'AUTH_VALIDATION_FAILED',
            errorEn: 'Invalid login payload.',
            errorAr: 'بيانات تسجيل الدخول غير صالحة.',
            details: error.details.map((detail) => detail.message),
        }));
    }

    const { email, password } = value;
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
            const match = await verifyPassword(password, u.password);

            if (match) {
                if (!isBcryptHash(u.password) && typeof u.password === 'string' && u.password.length > 0) {
                    try {
                        const upgradedHash = await hashPassword(password);
                        await dbQuery('UPDATE users SET password = $1 WHERE id = $2', [upgradedHash, u.id]);
                        u.password = upgradedHash;
                    } catch (upgradeError) {
                        log(`[Auth/Login] Legacy password upgrade failed for user ${u.id}: ${upgradeError.message}`);
                    }
                }

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
                const csrfToken = crypto.randomBytes(32).toString('hex');

                res.cookie(COOKIE_NAME, authToken.token, authToken.cookieOptions);
                res.cookie(CSRF_COOKIE_NAME, csrfToken, buildCsrfCookieOptions(authToken.cookieOptions.maxAge));

                safe.tokenExpiresAt = authToken.expiresAt;
                safe.tokenExpiresInSeconds = authToken.expiresInSeconds;

                return res.json(safe);
            }
        }
        log(`[Auth/Login] Failed (401): ${email}`);
        res.status(401).json({ error: 'Auth Failed' });
    } catch (e) {
        log(`[Auth/Login Error] ${email}: ${e.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const logout = async (req, res) => {
    const sameSiteRaw = (getEnvValue('AUTH_COOKIE_SAMESITE') || 'lax').toLowerCase();
    const sameSite = ['lax', 'strict', 'none'].includes(sameSiteRaw) ? sameSiteRaw : 'lax';
    const secure = getEnvValue('AUTH_COOKIE_SECURE') === 'true' || process.env.NODE_ENV === 'production' || sameSite === 'none';

    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure,
        sameSite,
        path: '/',
    });
    res.clearCookie(CSRF_COOKIE_NAME, {
        httpOnly: false,
        secure,
        sameSite,
        path: '/',
    });

    return res.json({ status: 'success' });
};

module.exports = {
    login,
    logout,
    __internal: {
        isBcryptHash,
        verifyPassword,
        hashPassword,
    },
};
