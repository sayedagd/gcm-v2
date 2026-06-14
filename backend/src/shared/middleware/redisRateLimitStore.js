const { getRedisClient } = require('../services/redisClientService');

class RedisRateLimitStore {
    constructor(windowMs) {
        this.windowMs = windowMs;
    }

    async increment(key) {
        try {
            const client = await getRedisClient();
            if (!client) {
                return {
                    totalHits: 1,
                    resetTime: new Date(Date.now() + this.windowMs)
                };
            }

            const nowMs = Date.now();
            const ttlSeconds = Math.max(1, Math.ceil(this.windowMs / 1000));

            const count = await client.incr(key);
            if (count === 1) {
                await client.expire(key, ttlSeconds);
            }

            const ttl = await client.ttl(key);
            const resetTime = new Date(nowMs + (Math.max(0, ttl) * 1000));
            
            return {
                totalHits: count,
                resetTime
            };
        } catch (error) {
            // Log the error but fallback to mock values to prevent crashing the request
            console.error('[REDIS Store] Increment error:', error.message);
            return {
                totalHits: 1,
                resetTime: new Date(Date.now() + this.windowMs)
            };
        }
    }

    async decrement(key) {
        try {
            const client = await getRedisClient();
            if (client) {
                await client.decr(key);
            }
        } catch (error) {
            console.error('[REDIS Store] Decrement error:', error.message);
        }
    }

    async resetKey(key) {
        try {
            const client = await getRedisClient();
            if (client) {
                await client.del(key);
            }
        } catch (error) {
            console.error('[REDIS Store] resetKey error:', error.message);
        }
    }
}

module.exports = {
    RedisRateLimitStore,
};
