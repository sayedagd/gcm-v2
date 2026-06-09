/*
 * Recommend DB pool size per instance from deployment concurrency inputs.
 */

const toInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const dbMaxConnections = toInt(process.env.DB_MAX_CONNECTIONS, 200);
const dbReservedConnections = toInt(process.env.DB_RESERVED_CONNECTIONS, 20);
const apiInstanceCount = toInt(process.env.API_INSTANCE_COUNT, 2);
const workerInstanceCount = toInt(process.env.WORKER_INSTANCE_COUNT, 2);
const totalInstanceCount = Math.max(1, apiInstanceCount + workerInstanceCount);

const availableConnections = Math.max(1, dbMaxConnections - dbReservedConnections);
const perInstanceBudget = Math.max(1, Math.floor(availableConnections / totalInstanceCount));
const recommendedApiPoolMax = Math.max(2, Math.floor(perInstanceBudget * 0.8));

const output = {
    inputs: {
        dbMaxConnections,
        dbReservedConnections,
        apiInstanceCount,
        workerInstanceCount,
    },
    derived: {
        availableConnections,
        totalInstanceCount,
        perInstanceBudget,
        recommendedApiPoolMax,
    },
    note: 'Set DB_POOL_MAX to recommendedApiPoolMax or lower, then validate with load tests and DB saturation metrics.',
};

console.log(JSON.stringify(output, null, 2));
