/**
 * GCM Error Middleware — Enhanced with Bilingual Responses
 * [AR] الوسيط المركزي لمعالجة الأخطاء — رسائل ثنائية اللغة
 */
const { translatePgError, serverError } = require('../utils/bilingualErrors');

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
        return res.status(pgStatus).json(pgErr);
    }

    // --- خطأ عام ---
    const isDev = process.env.NODE_ENV === 'development';
    const errResp = serverError(isDev ? err.message : '');
    res.status(statusCode).json({
        ...errResp,
        error: isDev ? err.message : 'Internal server error',
        stack: isDev ? err.stack : undefined,
    });
};

// eslint-disable-next-line no-unused-vars
const notFound = (req, res, next) => {
    res.status(404).json({
        error: `Not Found - ${req.originalUrl}`,
        errorAr: `الصفحة غير موجودة: ${req.originalUrl}`,
        errorEn: `Page not found: ${req.originalUrl}`,
        code: 'NOT_FOUND',
    });
};

module.exports = { errorHandler, notFound };
