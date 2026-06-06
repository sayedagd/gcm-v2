/**
 * JWT Authentication Middleware
 * Protects endpoints from unauthorized access by verifying the JWT token.
 * Supports: Bearer header, HttpOnly cookie (gcm_jwt).
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { log } = require('../utils/logger');
const { sendError } = require('../utils/apiError');
const { recordAuthFailure } = require('../services/metricsService');
const { getJwtSecret } = require('../config/auth');

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'gcm_jwt';
const CSRF_COOKIE_NAME = process.env.AUTH_CSRF_COOKIE_NAME || 'gcm_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

const isUnsafeMethod = (method = 'GET') => !['GET', 'HEAD', 'OPTIONS'].includes(String(method).toUpperCase());

const parseCookieHeader = (cookieHeader = '') => {
    return cookieHeader
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((acc, pair) => {
            const separatorIndex = pair.indexOf('=');
            if (separatorIndex <= 0) return acc;
            const key = pair.slice(0, separatorIndex).trim();
            const value = pair.slice(separatorIndex + 1).trim();
            acc[key] = decodeURIComponent(value);
            return acc;
        }, {});
};

const getCookieToken = (req) => {
    if (req.cookies && req.cookies[COOKIE_NAME]) {
        return req.cookies[COOKIE_NAME];
    }

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const parsed = parseCookieHeader(cookieHeader);
    return parsed[COOKIE_NAME] || null;
};

const getCookieValue = (req, cookieName) => {
    if (req.cookies && req.cookies[cookieName]) {
        return req.cookies[cookieName];
    }

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const parsed = parseCookieHeader(cookieHeader);
    return parsed[cookieName] || null;
};

const isMatchingCsrfToken = (cookieToken, headerToken) => {
    if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
        return false;
    }

    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);
    if (cookieBuffer.length !== headerBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(cookieBuffer, headerBuffer);
};

const protect = (req, res, next) => {
    let token = null;
    const cookieToken = getCookieToken(req);
    let authSource = null;

    // 1. Bearer header (standard API calls)
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
        authSource = 'bearer';
    }
    // 2. HttpOnly cookie auth
    else if (cookieToken) {
        token = cookieToken;
        authSource = 'cookie';
    }

    if (authSource === 'cookie' && isUnsafeMethod(req.method)) {
        const csrfCookieToken = getCookieValue(req, CSRF_COOKIE_NAME);
        const csrfHeaderToken = (req.headers[CSRF_HEADER_NAME] || '').toString();

        if (!isMatchingCsrfToken(csrfCookieToken, csrfHeaderToken)) {
            recordAuthFailure({ code: 'AUTH_CSRF_INVALID' });
            return sendError(res, 403, {
                code: 'AUTH_CSRF_INVALID',
                error: 'Invalid CSRF token',
                errorEn: 'Invalid CSRF token',
                errorAr: 'رمز CSRF غير صالح'
            });
        }
    }

    if (!token) {
        log(`[Auth/Protect] Not authorized, no token provided`);
        recordAuthFailure({ code: 'AUTH_NO_TOKEN' });
        return sendError(res, 401, {
            code: 'AUTH_NO_TOKEN',
            error: 'Not authorized, no token',
            errorEn: 'Not authorized, no token',
            errorAr: 'غير مصرح: لا يوجد رمز دخول'
        });
    }

    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
        console.error('[CRITICAL] JWT_SECRET not set in environment!');
        recordAuthFailure({ code: 'SERVER_CONFIG_ERROR' });
        return sendError(res, 500, {
            code: 'SERVER_CONFIG_ERROR',
            error: 'Server configuration error',
            errorEn: 'Server configuration error',
            errorAr: 'خطأ في إعدادات الخادم'
        });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });

        req.user = decoded;
        req.authSource = authSource;
        return next();
    } catch (error) {
        if (error && error.name === 'TokenExpiredError') {
            recordAuthFailure({ code: 'AUTH_TOKEN_EXPIRED' });
            res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token", error_description="The access token expired"');
            return sendError(res, 401, {
                code: 'AUTH_TOKEN_EXPIRED',
                error: 'Token expired, please sign in again',
                errorEn: 'Token expired, please sign in again',
                errorAr: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى'
            });
        }

        log(`[Auth/Protect] Not authorized, token failed: ${error.message}`);
        recordAuthFailure({ code: 'AUTH_TOKEN_FAILED' });
        return sendError(res, 401, {
            code: 'AUTH_TOKEN_FAILED',
            error: 'Not authorized, token failed',
            errorEn: 'Not authorized, token failed',
            errorAr: 'غير مصرح: فشل التحقق من الرمز'
        });
    }
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const role = req.user?.role;

        if (!role) {
            return sendError(res, 403, {
                code: 'AUTH_FORBIDDEN',
                error: 'Forbidden',
                errorEn: 'Forbidden',
                errorAr: 'ممنوع'
            });
        }

        if (!allowedRoles.includes(role)) {
            log(`[Auth/Authorize] Forbidden for role ${role}; allowed: ${allowedRoles.join(', ')}`);
            return sendError(res, 403, {
                code: 'AUTH_FORBIDDEN_ROLE',
                error: 'Forbidden',
                errorEn: 'Forbidden',
                errorAr: 'ممنوع'
            });
        }

        return next();
    };
};

module.exports = {
    protect,
    authorizeRoles,
    _internal: {
        parseCookieHeader,
        getCookieToken,
    }
};
