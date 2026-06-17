/**
 * GCM Error Middleware — Enhanced with Bilingual Responses
 * [AR] الوسيط المركزي لمعالجة الأخطاء — رسائل ثنائية اللغة
 */
const { translatePgError, serverError } = require('../utils/bilingualErrors');
const { sendError } = require('../utils/apiError');
const { logEvent } = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    logEvent('http_error', {
        correlationId: req.correlationId || res.locals?.correlationId || null,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });

    // Always output stack to stderr/Vercel console for debugging
    console.error('[errorHandler] Caught error:', err.stack || err);

    if (err && err.type === 'entity.parse.failed') {
        return sendError(res, 400, {
            code: 'INVALID_JSON_PAYLOAD',
            error: 'Invalid JSON payload',
            errorEn: 'Invalid JSON payload',
            errorAr: 'بيانات JSON غير صالحة'
        });
    }

    if (err && typeof err.message === 'string' && err.message.startsWith('CORS blocked for origin:')) {
        return sendError(res, 403, {
            code: 'CORS_FORBIDDEN_ORIGIN',
            error: 'CORS origin not allowed',
            errorEn: 'CORS origin not allowed',
            errorAr: 'مصدر الطلب غير مسموح في إعدادات CORS'
        });
    }

    // --- ترجمة أخطاء PostgreSQL ---
    if (err.code && (err.code.startsWith('23') || err.code.startsWith('22'))) {
        const table = req.baseUrl.split('/').pop() || 'unknown';
        const pgErr = translatePgError(err, table);
        const pgStatus = err.code === '23505' ? 409 : 400;
        return sendError(res, pgStatus, {
            code: pgErr.code || 'DB_ERROR',
            error: pgErr.error || pgErr.errorEn || 'Database error',
            errorEn: pgErr.errorEn || pgErr.error || 'Database error',
            errorAr: pgErr.errorAr || 'خطأ في قاعدة البيانات',
            field: pgErr.field,
            details: pgErr.details
        });
    }

    // --- خطأ عام ---
    const isDev = process.env.NODE_ENV === 'development';
    const errResp = serverError(isDev ? err.message : '');
    return sendError(res, statusCode, {
        code: errResp.code || 'SERVER_ERROR',
        error: isDev ? err.message : 'Internal server error',
        errorEn: errResp.errorEn || (isDev ? err.message : 'Internal server error'),
        errorAr: errResp.errorAr || 'حدث خطأ في الخادم',
        details: isDev ? { stack: err.stack } : undefined
    });
};

// eslint-disable-next-line no-unused-vars
const notFound = (req, res, next) => {
    return sendError(res, 404, {
        code: 'NOT_FOUND',
        error: `Not Found - ${req.originalUrl}`,
        errorAr: `الصفحة غير موجودة: ${req.originalUrl}`,
        errorEn: `Page not found: ${req.originalUrl}`
    });
};

module.exports = { errorHandler, notFound };
