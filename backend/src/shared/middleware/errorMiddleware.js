/**
 * GCM Error Middleware — Enhanced with Bilingual Responses
 * [AR] الوسيط المركزي لمعالجة الأخطاء — رسائل ثنائية اللغة
 */
const { translatePgError, serverError } = require('../utils/bilingualErrors');
const { sendError } = require('../utils/apiError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    console.error(`[Error] ${req.method} ${req.url}`, err.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
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
