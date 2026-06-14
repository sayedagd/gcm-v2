const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const { RedisRateLimitStore } = require('./redisRateLimitStore');
const { isRedisEnabled } = require('../services/redisClientService');

const noop = (req, res, next) => next();

const buildLimiter = (rateLimitLib, options) => {
    if (!rateLimitLib) {
        return noop;
    }

    return rateLimitLib({
        windowMs: options.windowMs,
        max: options.max,
        ...(options.store ? { store: options.store } : {}),
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: options.message },
        skip: options.skip,
    });
};

const buildRateLimitPolicies = (rateLimitLib) => {
    const globalWindowMs = parsePositiveInt(process.env.RL_GLOBAL_WINDOW_MS, 15 * 60 * 1000);
    const globalMax = parsePositiveInt(process.env.RL_GLOBAL_MAX, 1000);
    const authWindowMs = parsePositiveInt(process.env.RL_AUTH_WINDOW_MS, 15 * 60 * 1000);
    const authMax = parsePositiveInt(process.env.RL_AUTH_MAX, 20);

    const publicWriteWindowMs = parsePositiveInt(process.env.RL_PUBLIC_WRITE_WINDOW_MS, 15 * 60 * 1000);
    const publicWriteMax = parsePositiveInt(process.env.RL_PUBLIC_WRITE_MAX, 40);
    const sseWindowMs = parsePositiveInt(process.env.RL_SSE_WINDOW_MS, 15 * 60 * 1000);
    const sseMax = parsePositiveInt(process.env.RL_SSE_MAX, 30);
    const adminWindowMs = parsePositiveInt(process.env.RL_ADMIN_WINDOW_MS, 15 * 60 * 1000);
    const adminMax = parsePositiveInt(process.env.RL_ADMIN_MAX, 30);
    const useRedisStore = process.env.NODE_ENV === 'production' || process.env.RL_USE_REDIS_STORE === 'true';

    const buildStore = (windowMs) => {
        if (!useRedisStore || !isRedisEnabled()) return null;
        return new RedisRateLimitStore(windowMs);
    };

    return {
        globalLimiter: buildLimiter(rateLimitLib, {
            windowMs: globalWindowMs,
            max: globalMax,
            store: buildStore(globalWindowMs),
            message: 'Too many requests, please try again later',
            skip: (req) => req.url.startsWith('/api/events') || req.url.startsWith('/api/v1/events'),
        }),
        authLimiter: buildLimiter(rateLimitLib, {
            windowMs: authWindowMs,
            max: authMax,
            store: buildStore(authWindowMs),
            message: 'Too many login attempts, please try again later',
        }),
        publicWriteLimiter: buildLimiter(rateLimitLib, {
            windowMs: publicWriteWindowMs,
            max: publicWriteMax,
            store: buildStore(publicWriteWindowMs),
            message: 'Too many public submissions, please try again later',
        }),
        sseTokenLimiter: buildLimiter(rateLimitLib, {
            windowMs: sseWindowMs,
            max: sseMax,
            store: buildStore(sseWindowMs),
            message: 'Too many SSE token requests, please try again later',
        }),
        adminOpsLimiter: buildLimiter(rateLimitLib, {
            windowMs: adminWindowMs,
            max: adminMax,
            store: buildStore(adminWindowMs),
            message: 'Too many sensitive admin operations, please try again later',
        }),
        limits: {
            global: { windowMs: globalWindowMs, max: globalMax },
            auth: { windowMs: authWindowMs, max: authMax },
            publicWrite: { windowMs: publicWriteWindowMs, max: publicWriteMax },
            sse: { windowMs: sseWindowMs, max: sseMax },
            admin: { windowMs: adminWindowMs, max: adminMax },
        },
    };
};

module.exports = {
    buildRateLimitPolicies,
    _internal: {
        parsePositiveInt,
    },
};
