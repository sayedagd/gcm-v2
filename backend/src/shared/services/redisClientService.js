const { log } = require('../utils/logger');
const getEnvValue = (key) => {
    const value = process.env[key];
    return typeof value === 'string' ? value.trim() : value;
};

let redisLib = null;
try {
    redisLib = require('redis');
} catch (_) {
    redisLib = null;
}

let clientPromise = null;
let ready = false;

const isRedisEnabled = () => {
    return getEnvValue('REDIS_ENABLED') === 'true' && Boolean(getEnvValue('REDIS_URL'));
};

const getRedisClient = async () => {
    if (!isRedisEnabled()) return null;
    if (!redisLib) return null;

    if (!clientPromise) {
        clientPromise = (async () => {
            const client = redisLib.createClient({ url: getEnvValue('REDIS_URL') });
            client.on('error', (error) => {
                ready = false;
                log(`[REDIS] Client error: ${error.message}`);
            });
            await client.connect();
            ready = true;
            log('[REDIS] Client connected');
            return client;
        })().catch((error) => {
            clientPromise = null;
            ready = false;
            log(`[REDIS] Connection failed: ${error.message}`);
            return null;
        });
    }

    return clientPromise;
};

const isRedisReady = () => ready;

module.exports = {
    getRedisClient,
    isRedisEnabled,
    isRedisReady,
};
