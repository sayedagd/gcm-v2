/**
 * JWT Authentication Middleware
 * Protects endpoints from unauthorized access by verifying the JWT token.
 * Supports: Bearer header, HttpOnly cookie (gcm_jwt), query param (?token= for SSE only).
 */
const jwt = require('jsonwebtoken');
const { log } = require('../utils/logger');

const protect = (req, res, next) => {
    let token = null;

    // 1. Bearer header (standard API calls)
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    }
    // 2. HttpOnly cookie (future default once TASK-19 lands)
    else if (req.cookies && req.cookies.gcm_jwt) {
        token = req.cookies.gcm_jwt;
    }
    // 3. Query param — allowed only for the SSE endpoint (EventSource can't set headers)
    else if (req.query && req.query.token && req.path === '/api/events') {
        token = req.query.token;
    }

    if (!token) {
        log(`[Auth/Protect] Not authorized, no token provided`);
        return res.status(401).json({ error: 'Not authorized, no token' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('[CRITICAL] JWT_SECRET not set in environment!');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        req.user = decoded;
        return next();
    } catch (error) {
        log(`[Auth/Protect] Not authorized, token failed: ${error.message}`);
        return res.status(401).json({ error: 'Not authorized, token failed' });
    }
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const role = req.user?.role;

        if (!role) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (!allowedRoles.includes(role)) {
            log(`[Auth/Authorize] Forbidden for role ${role}; allowed: ${allowedRoles.join(', ')}`);
            return res.status(403).json({ error: 'Forbidden' });
        }

        return next();
    };
};

module.exports = {
    protect,
    authorizeRoles
};
