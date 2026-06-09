/**
 * GCM System Health Controller (Micro-Module)
 */
const systemController = require('../../../shared/controllers/systemController');
const metricsService = require('../../../shared/services/metricsService');

let query = null;
try {
    query = require('../../../../database').query;
} catch (_) {
    query = null;
}

const checkDependencyWithTimeout = async (dependencyName, checkFn, timeoutMs = 2000) => {
    const startedAt = Date.now();

    try {
        await Promise.race([
            Promise.resolve().then(checkFn),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
        ]);

        return {
            name: dependencyName,
            status: 'up',
            latencyMs: Date.now() - startedAt,
        };
    } catch (error) {
        return {
            name: dependencyName,
            status: 'down',
            latencyMs: Date.now() - startedAt,
            error: error.message,
        };
    }
};

const getLiveness = (req, res) => {
    return res.json({
        status: 'ok',
        type: 'liveness',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    });
};

const getReadiness = async (req, res) => {
    const dbDependency = await checkDependencyWithTimeout(
        'database',
        async () => {
            if (!query) {
                throw new Error('db-query-unavailable');
            }
            await query('SELECT 1', [], { suppressSlowLog: true, queryTag: 'health_readiness' });
        },
        2000
    );

    const isReady = dbDependency.status === 'up';
    return res.status(isReady ? 200 : 503).json({
        status: isReady ? 'ready' : 'not_ready',
        type: 'readiness',
        dependencies: [dbDependency],
        timestamp: new Date().toISOString(),
    });
};

const getDependencies = async (req, res) => {
    const dependencyChecks = [
        checkDependencyWithTimeout('database', async () => {
            if (!query) {
                throw new Error('db-query-unavailable');
            }
            await query('SELECT 1', [], { suppressSlowLog: true, queryTag: 'health_dependencies' });
        }, 2000),
        Promise.resolve({
            name: 'metrics',
            status: 'up',
            sample: metricsService.getMetricsSnapshot().metrics,
        }),
    ];

    const dependencies = await Promise.all(dependencyChecks);
    const hasFailure = dependencies.some((dep) => dep.status !== 'up');

    return res.status(hasFailure ? 503 : 200).json({
        status: hasFailure ? 'degraded' : 'healthy',
        type: 'dependencies',
        dependencies,
        timestamp: new Date().toISOString(),
    });
};

module.exports = {
    checkHealth: systemController.getHealth,
    ping: systemController.getPing,
    liveness: getLiveness,
    readiness: getReadiness,
    dependencies: getDependencies,
};
