const crypto = require('crypto');
const { getRedisClient } = require('./redisClientService');

const createIdempotencyKey = (prefix, identity) => {
    const hash = crypto.createHash('sha256').update(String(identity || '')).digest('hex').slice(0, 24);
    return `${prefix}:${hash}`;
};

const getIdempotencyValue = async ({ namespace, identity }) => {
    const client = await getRedisClient();
    if (!client) return null;

    const key = createIdempotencyKey(namespace, identity);
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
};

const setIdempotencyValue = async ({ namespace, identity, value, ttlSeconds = 600 }) => {
    const client = await getRedisClient();
    if (!client) return false;

    const key = createIdempotencyKey(namespace, identity);
    await client.set(key, JSON.stringify(value), { EX: Math.max(1, ttlSeconds) });
    return true;
};

const setShortLivedTokenState = async ({ tokenId, value, ttlSeconds = 300 }) => {
    const client = await getRedisClient();
    if (!client) return false;

    const key = `token:${tokenId}`;
    await client.set(key, JSON.stringify(value), { EX: Math.max(1, ttlSeconds) });
    return true;
};

const getShortLivedTokenState = async (tokenId) => {
    const client = await getRedisClient();
    if (!client) return null;

    const key = `token:${tokenId}`;
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
};

module.exports = {
    getIdempotencyValue,
    setIdempotencyValue,
    setShortLivedTokenState,
    getShortLivedTokenState,
};
