const { randomUUID } = require('crypto');
const { logEvent, runWithLogContext } = require('../utils/logger');
const { observeRequest, getMetricsSnapshot } = require('../services/metricsService');

const getIncomingCorrelationId = (req) => {
    const incoming = req.headers['x-correlation-id'] || req.headers['x-request-id'];
    if (!incoming) return null;
    return String(incoming).trim() || null;
};

const requestContext = (req, res, next) => {
    const startedAtMs = Date.now();
    const correlationId = getIncomingCorrelationId(req) || randomUUID();

    req.correlationId = correlationId;
    res.locals.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    const bindContext = typeof runWithLogContext === 'function'
        ? runWithLogContext
        : (_, handler) => handler();

    bindContext({ correlationId }, () => {
        res.on('finish', () => {
            const durationMs = Date.now() - startedAtMs;
            observeRequest({
                path: req.originalUrl || req.url,
                statusCode: res.statusCode,
                durationMs,
            });

            logEvent('http_request', {
                correlationId,
                method: req.method,
                path: req.originalUrl || req.url,
                statusCode: res.statusCode,
                durationMs,
                userId: req.user?.id || null,
                role: req.user?.role || null,
            });

            const snapshot = getMetricsSnapshot();
            if (snapshot.activeAlerts.length > 0) {
                snapshot.activeAlerts.forEach((alert) => {
                    logEvent('metric_alert', {
                        correlationId,
                        ...alert,
                    });
                });
            }
        });

        next();
    });
};

module.exports = {
    requestContext,
};
