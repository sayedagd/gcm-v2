/**
 * Canonical API error envelope with backward-compatible top-level fields.
 */
const buildErrorPayload = ({
    code = 'INTERNAL_ERROR',
    error = 'Internal server error',
    errorEn = error,
    errorAr = 'حدث خطأ غير متوقع',
    traceId,
    field,
    details
} = {}) => {
    const normalized = {
        status: 'error',
        errorInfo: {
            code,
            message: error,
            errorEn,
            errorAr
        },
        // Backward compatibility fields for existing frontend callers.
        code,
        error,
        errorEn,
        errorAr
    };

    if (traceId) {
        normalized.errorInfo.traceId = traceId;
        normalized.traceId = traceId;
    }

    if (field) {
        normalized.errorInfo.field = field;
        normalized.field = field;
    }

    if (typeof details !== 'undefined') {
        normalized.errorInfo.details = details;
        normalized.details = details;
    }

    return normalized;
};

const sendError = (res, statusCode, payload) => {
    const traceId = payload?.traceId || res?.locals?.correlationId;
    return res.status(statusCode).json(buildErrorPayload({
        ...payload,
        traceId,
    }));
};

module.exports = {
    buildErrorPayload,
    sendError
};
