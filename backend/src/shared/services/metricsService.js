const WINDOW_15M_MS = 15 * 60 * 1000;
const WINDOW_24H_MS = 24 * 60 * 60 * 1000;

const parsePositive = (value, fallback) => {
    const parsed = Number.parseFloat(String(value || ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const thresholds = {
    errorRatePercent15m: parsePositive(process.env.METRIC_ALERT_ERROR_RATE_PERCENT_15M, 5),
    avgLatencyMs15m: parsePositive(process.env.METRIC_ALERT_AVG_LATENCY_MS_15M, 1200),
    authFailures15m: parsePositive(process.env.METRIC_ALERT_AUTH_FAILURES_15M, 30),
    sseDisconnects15m: parsePositive(process.env.METRIC_ALERT_SSE_DISCONNECTS_15M, 60),
    backupFailures24h: parsePositive(process.env.METRIC_ALERT_BACKUP_FAILURES_24H, 1),
};

const state = {
    startedAt: Date.now(),
    requests: [],
    dbQueries: [],
    authFailures: [],
    backupFailures: [],
    sseDisconnects: [],
    sseConnectedCurrent: 0,
    queueDepths: {
        backups: null,
        whatsapp: null,
    },
    latestAlerts: [],
};

const prune = (arr, maxAgeMs) => {
    const minTs = Date.now() - maxAgeMs;
    while (arr.length > 0 && arr[0].ts < minTs) {
        arr.shift();
    }
};

const addAlert = (name, value, threshold, window) => {
    state.latestAlerts.push({
        ts: new Date().toISOString(),
        name,
        value,
        threshold,
        window,
    });
    if (state.latestAlerts.length > 20) {
        state.latestAlerts = state.latestAlerts.slice(-20);
    }
};

const percentile = (values, p) => {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    const bounded = Math.max(0, Math.min(sorted.length - 1, index));
    return sorted[bounded];
};

const observeRequest = ({ path, statusCode, durationMs }) => {
    state.requests.push({
        ts: Date.now(),
        path,
        statusCode,
        durationMs,
    });
    prune(state.requests, WINDOW_15M_MS);
};

const observeDbQuery = ({ durationMs, queryTag = null, queryFingerprint = null, isSlow = false }) => {
    state.dbQueries.push({
        ts: Date.now(),
        durationMs,
        queryTag,
        queryFingerprint,
        isSlow: Boolean(isSlow),
    });
    prune(state.dbQueries, WINDOW_15M_MS);
};

const recordAuthFailure = ({ code }) => {
    state.authFailures.push({ ts: Date.now(), code });
    prune(state.authFailures, WINDOW_15M_MS);
};

const recordBackupFailure = ({ message }) => {
    state.backupFailures.push({ ts: Date.now(), message });
    prune(state.backupFailures, WINDOW_24H_MS);
};

const recordSseDisconnect = () => {
    state.sseDisconnects.push({ ts: Date.now() });
    prune(state.sseDisconnects, WINDOW_15M_MS);
};

const setSseConnectedCount = (count) => {
    const parsed = Number(count);
    state.sseConnectedCurrent = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const setQueueDepth = ({ queueName, depth }) => {
    if (!queueName) return;
    const parsedDepth = Number(depth);
    state.queueDepths[queueName] = Number.isFinite(parsedDepth) && parsedDepth >= 0 ? parsedDepth : null;
};

const evaluateAlerts = () => {
    prune(state.requests, WINDOW_15M_MS);
    prune(state.dbQueries, WINDOW_15M_MS);
    prune(state.authFailures, WINDOW_15M_MS);
    prune(state.sseDisconnects, WINDOW_15M_MS);
    prune(state.backupFailures, WINDOW_24H_MS);

    const requestCount = state.requests.length;
    const requestErrors = state.requests.filter((r) => r.statusCode >= 500).length;
    const avgLatencyMs =
        requestCount > 0
            ? state.requests.reduce((sum, r) => sum + Number(r.durationMs || 0), 0) / requestCount
            : 0;
    const errorRatePercent = requestCount > 0 ? (requestErrors / requestCount) * 100 : 0;

    const triggered = [];

    if (requestCount > 0 && errorRatePercent >= thresholds.errorRatePercent15m) {
        const alert = {
            name: 'error_rate_15m',
            value: Number(errorRatePercent.toFixed(2)),
            threshold: thresholds.errorRatePercent15m,
            window: '15m',
        };
        triggered.push(alert);
        addAlert(alert.name, alert.value, alert.threshold, alert.window);
    }

    if (requestCount > 0 && avgLatencyMs >= thresholds.avgLatencyMs15m) {
        const alert = {
            name: 'avg_latency_15m_ms',
            value: Number(avgLatencyMs.toFixed(2)),
            threshold: thresholds.avgLatencyMs15m,
            window: '15m',
        };
        triggered.push(alert);
        addAlert(alert.name, alert.value, alert.threshold, alert.window);
    }

    if (state.authFailures.length >= thresholds.authFailures15m) {
        const alert = {
            name: 'auth_failures_15m',
            value: state.authFailures.length,
            threshold: thresholds.authFailures15m,
            window: '15m',
        };
        triggered.push(alert);
        addAlert(alert.name, alert.value, alert.threshold, alert.window);
    }

    if (state.sseDisconnects.length >= thresholds.sseDisconnects15m) {
        const alert = {
            name: 'sse_disconnects_15m',
            value: state.sseDisconnects.length,
            threshold: thresholds.sseDisconnects15m,
            window: '15m',
        };
        triggered.push(alert);
        addAlert(alert.name, alert.value, alert.threshold, alert.window);
    }

    if (state.backupFailures.length >= thresholds.backupFailures24h) {
        const alert = {
            name: 'backup_failures_24h',
            value: state.backupFailures.length,
            threshold: thresholds.backupFailures24h,
            window: '24h',
        };
        triggered.push(alert);
        addAlert(alert.name, alert.value, alert.threshold, alert.window);
    }

    return triggered;
};

const getMetricsSnapshot = () => {
    prune(state.requests, WINDOW_15M_MS);
    prune(state.dbQueries, WINDOW_15M_MS);
    prune(state.authFailures, WINDOW_15M_MS);
    prune(state.sseDisconnects, WINDOW_15M_MS);
    prune(state.backupFailures, WINDOW_24H_MS);

    const requestCount = state.requests.length;
    const requestErrors = state.requests.filter((r) => r.statusCode >= 500).length;
    const avgLatencyMs =
        requestCount > 0
            ? state.requests.reduce((sum, r) => sum + Number(r.durationMs || 0), 0) / requestCount
            : 0;
    const errorRatePercent = requestCount > 0 ? (requestErrors / requestCount) * 100 : 0;
    const requestDurations = state.requests.map((r) => Number(r.durationMs || 0));
    const dbQueryCount = state.dbQueries.length;
    const dbQueryDurations = state.dbQueries.map((q) => Number(q.durationMs || 0));
    const slowQueries = state.dbQueries.filter((q) => q.isSlow);
    const slowQueryCount = slowQueries.length;
    const slowFingerprintBuckets = new Map();
    slowQueries.forEach((queryMetric) => {
        const key = queryMetric.queryFingerprint || 'unknown';
        const existing = slowFingerprintBuckets.get(key) || 0;
        slowFingerprintBuckets.set(key, existing + 1);
    });
    const topSlowFingerprints = [...slowFingerprintBuckets.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([fingerprint, count]) => ({ fingerprint, count }));
    const dbAvgLatencyMs =
        dbQueryCount > 0
            ? state.dbQueries.reduce((sum, q) => sum + Number(q.durationMs || 0), 0) / dbQueryCount
            : 0;

    const activeAlerts = evaluateAlerts();

    return {
        generatedAt: new Date().toISOString(),
        uptimeSeconds: Math.round((Date.now() - state.startedAt) / 1000),
        thresholds,
        metrics: {
            requestCount15m: requestCount,
            requestErrors15m: requestErrors,
            avgLatencyMs15m: Number(avgLatencyMs.toFixed(2)),
            latencyP50Ms15m: Number(percentile(requestDurations, 50).toFixed(2)),
            latencyP95Ms15m: Number(percentile(requestDurations, 95).toFixed(2)),
            latencyP99Ms15m: Number(percentile(requestDurations, 99).toFixed(2)),
            errorRatePercent15m: Number(errorRatePercent.toFixed(2)),
            dbQueryCount15m: dbQueryCount,
            dbAvgLatencyMs15m: Number(dbAvgLatencyMs.toFixed(2)),
            dbLatencyP50Ms15m: Number(percentile(dbQueryDurations, 50).toFixed(2)),
            dbLatencyP95Ms15m: Number(percentile(dbQueryDurations, 95).toFixed(2)),
            dbLatencyP99Ms15m: Number(percentile(dbQueryDurations, 99).toFixed(2)),
            dbSlowQueryCount15m: slowQueryCount,
            dbTopSlowFingerprints15m: topSlowFingerprints,
            authFailures15m: state.authFailures.length,
            sseConnectedCurrent: state.sseConnectedCurrent,
            sseDisconnects15m: state.sseDisconnects.length,
            backupFailures24h: state.backupFailures.length,
            queueDepths: { ...state.queueDepths },
        },
        activeAlerts,
        latestAlerts: state.latestAlerts,
    };
};

module.exports = {
    observeRequest,
    observeDbQuery,
    recordAuthFailure,
    recordBackupFailure,
    setSseConnectedCount,
    recordSseDisconnect,
    setQueueDepth,
    getMetricsSnapshot,
    _internal: {
        state,
        thresholds,
        prune,
        percentile,
        evaluateAlerts,
    },
};
