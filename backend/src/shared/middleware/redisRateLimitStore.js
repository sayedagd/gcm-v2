const { getRedisClient } = require('../services/redisClientService');

class RedisRateLimitStore {
    constructor(windowMs) {
        this.windowMs = windowMs;
    }

    async increment(key, cb) {
        try {
            const client = await getRedisClient();
            if (!client) {
                return cb(null, 1, new Date(Date.now() + this.windowMs));
            }

            const nowMs = Date.now();
            const ttlSeconds = Math.max(1, Math.ceil(this.windowMs / 1000));

            const count = await client.incr(key);
            if (count === 1) {
                await client.expire(key, ttlSeconds);
            }

            const ttl = await client.ttl(key);
            const resetTime = new Date(nowMs + (Math.max(0, ttl) * 1000));
            return cb(null, count, resetTime);
        } catch (error) {
            return cb(error);
        }
    }

    decrement(key) {
        getRedisClient()
            .then((client) => client && client.decr(key))
            .catch(() => {});
    }

    resetKey(key) {
        getRedisClient()
            .then((client) => client && client.del(key))
            .catch(() => {});
    }
}

module.exports = {
    RedisRateLimitStore,
};
