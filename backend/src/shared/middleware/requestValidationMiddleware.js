const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const { buildValidationError } = require('../utils/validationErrorContract');

const isPlainObject = (value) => {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const shouldSkipSanitize = (key = '') => {
    const normalized = String(key).toLowerCase();
    if (!normalized) return false;

    return normalized.includes('url') || normalized.endsWith('_file') || normalized === 'avatar';
};

const sanitizeString = (value) => {
    return String(value)
        .replace(/<script[^>]*>(.|\n|\r)*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
};

const sanitizePayload = (input, key = '') => {
    if (Array.isArray(input)) {
        return input.map((item) => sanitizePayload(item));
    }

    if (isPlainObject(input)) {
        const output = {};
        for (const [childKey, childValue] of Object.entries(input)) {
            output[childKey] = sanitizePayload(childValue, childKey);
        }
        return output;
    }

    if (typeof input === 'string' && !shouldSkipSanitize(key)) {
        return sanitizeString(input);
    }

    return input;
};

const shouldValidateBodyShape = (req) => {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    return contentType.includes('application/json') || contentType.includes('application/x-www-form-urlencoded');
};

const validateAndSanitizeWritePayload = (req, res, next) => {
    if (!WRITE_METHODS.has(req.method)) {
        return next();
    }

    if (shouldValidateBodyShape(req) && req.body !== undefined && req.body !== null && !isPlainObject(req.body)) {
        const payload = buildValidationError({
            code: 'INVALID_BODY_SHAPE',
            errorEn: 'Write endpoints require a JSON object payload.',
            errorAr: 'نقاط الكتابة تتطلب حمولة JSON على شكل كائن.',
        });

        payload.traceId = res.locals?.correlationId;
        return res.status(400).json(payload);
    }

    if (isPlainObject(req.body)) {
        req.body = sanitizePayload(req.body);
    }

    return next();
};

module.exports = {
    validateAndSanitizeWritePayload,
    // Exposed for unit tests.
    _internal: {
        isPlainObject,
        sanitizePayload,
        sanitizeString,
        shouldSkipSanitize,
    },
};
