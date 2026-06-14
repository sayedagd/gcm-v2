/**
 * GCM Event Bus — Server-Sent Events
 * Replaces socket.io. Works on Apache/Passenger because it's plain HTTP.
 *
 * Usage:
 *   const { sseHandler, publish } = require('./eventBus');
 *   app.get('/api/events', protect, sseHandler);
 *   publish('trip:created', tripRow);
 */
const { log } = require('../utils/logger');
const { query } = require('../../../database');
const metricsService = require('./metricsService');
const recordSseDisconnect = metricsService.recordSseDisconnect || (() => {});
const setSseConnectedCount = metricsService.setSseConnectedCount || (() => {});
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

/** @type {Set<{res, user, lastEventId}>} */
const clients = new Set();
let eventCounter = 0;
let redisReady = false;
let redisPub = null;
let redisSub = null;

const brokerEnabled = getEnvValue('EVENT_BUS_BROKER') === 'redis';
const redisChannel = getEnvValue('EVENT_BUS_REDIS_CHANNEL') || 'gcm:event-bus';
const redisUrl = getEnvValue('REDIS_URL');
const replayLimit = Number.parseInt(process.env.EVENT_BUS_REPLAY_LIMIT || '200', 10);
const replayRetentionDays = Number.parseInt(process.env.EVENT_BUS_REPLAY_RETENTION_DAYS || '7', 10);
const maxConnectionsGlobal = Number.parseInt(process.env.SSE_MAX_CONNECTIONS_GLOBAL || '1000', 10);
const maxConnectionsPerUser = Number.parseInt(process.env.SSE_MAX_CONNECTIONS_PER_USER || '3', 10);
const maxConnectionsPerCompany = Number.parseInt(process.env.SSE_MAX_CONNECTIONS_PER_COMPANY || '100', 10);
const maxConnectionsPerSupplier = Number.parseInt(process.env.SSE_MAX_CONNECTIONS_PER_SUPPLIER || '100', 10);
const maxConnectionsStaffPool = Number.parseInt(process.env.SSE_MAX_CONNECTIONS_STAFF_POOL || '200', 10);
let replayStoreReady = false;
let replayStorePromise = null;

// ───────────────────────────────────────────────
// Visibility rules — single source of truth
// ───────────────────────────────────────────────
const STAFF_ROLES = new Set(['ADMIN', 'REPORTS_MANAGER', 'LOGISTICS', 'DATA_ENTRY', 'ACCOUNTANT']);

/**
 * Returns true if `client` should see `event` with `data`.
 */
const isVisible = (client, event, data) => {
    const u = client.user || {};
    const role = u.role;

    if (STAFF_ROLES.has(role)) return true;

    // Trip events
    if (event.startsWith('trip:')) {
        if (role === 'DRIVER') return data.driver_id === u.id;
        if (role === 'SUBCONTRACTOR') return data.supplier_id === u.supplier_id;
        if (role === 'PROJECT_USER') return data.project_id === u.project_id;
        if (role === 'CLIENT' || role === 'COMPANY_USER') {
            return data._company_id === u.company_id;
        }
        return false;
    }

    // Project events
    if (event.startsWith('project:')) {
        if (role === 'CLIENT' || role === 'COMPANY_USER') return data.company_id === u.company_id;
        if (role === 'PROJECT_USER') return data.project_id === u.project_id;
        return false;
    }

    // Company events
    if (event.startsWith('company:')) {
        if (role === 'CLIENT' || role === 'COMPANY_USER') return data.company_id === u.company_id;
        return false;
    }

    // Vehicle / driver / asset request events
    if (event.startsWith('vehicle:') || event.startsWith('driver:') || event.startsWith('asset_req:')) {
        if (role === 'SUBCONTRACTOR') return data.supplier_id === u.supplier_id;
        return false;
    }

    // Notifications: only the targeted user
    if (event === 'notif:new') {
        return data.user_id === u.id;
    }

    // Permission requests: requester sees their own
    if (event.startsWith('permission_req:')) {
        return data.user_id === u.id; // ADMIN already returned true above
    }

    // Inventory: staff only (already handled). Clients see if same company is referenced.
    if (event.startsWith('inventory:')) {
        if (role === 'CLIENT' || role === 'COMPANY_USER') return data.company_id === u.company_id;
        return false;
    }

    // Presence: staff only
    if (event.startsWith('presence:')) {
        return false;
    }

    // Default deny
    return false;
};

const countConnections = (predicate) => {
    let count = 0;
    for (const client of clients) {
        if (predicate(client)) count += 1;
    }
    return count;
};

const quotaViolation = (user) => {
    if (clients.size >= maxConnectionsGlobal) {
        return `Global SSE connection quota reached (${maxConnectionsGlobal})`;
    }

    const userConnections = countConnections((client) => client.user?.id === user.id);
    if (userConnections >= maxConnectionsPerUser) {
        return `Per-user SSE connection quota reached (${maxConnectionsPerUser})`;
    }

    if (STAFF_ROLES.has(user.role)) {
        const staffConnections = countConnections((client) => STAFF_ROLES.has(client.user?.role));
        if (staffConnections >= maxConnectionsStaffPool) {
            return `Staff SSE connection pool quota reached (${maxConnectionsStaffPool})`;
        }
        return null;
    }

    if ((user.role === 'CLIENT' || user.role === 'COMPANY_USER') && user.company_id) {
        const companyConnections = countConnections(
            (client) => (client.user?.role === 'CLIENT' || client.user?.role === 'COMPANY_USER')
                && client.user?.company_id === user.company_id
        );
        if (companyConnections >= maxConnectionsPerCompany) {
            return `Company SSE connection quota reached (${maxConnectionsPerCompany})`;
        }
    }

    if (user.role === 'SUBCONTRACTOR' && user.supplier_id) {
        const supplierConnections = countConnections(
            (client) => client.user?.role === 'SUBCONTRACTOR' && client.user?.supplier_id === user.supplier_id
        );
        if (supplierConnections >= maxConnectionsPerSupplier) {
            return `Supplier SSE connection quota reached (${maxConnectionsPerSupplier})`;
        }
    }

    return null;
};

// ───────────────────────────────────────────────
// SSE HTTP handler
// ───────────────────────────────────────────────
const sseHandler = (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authorized' });
    }

    const violation = quotaViolation(req.user);
    if (violation) {
        return res.status(429).json({ error: violation });
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // disables nginx/proxy buffering
    });

    // Initial flush
    res.write('retry: 5000\n');
    res.write(': connected\n\n');
    if (typeof res.flush === 'function') res.flush();

    const lastEventId = parseInt(req.headers['last-event-id'] || '0', 10);

    const client = { res, user: req.user, lastEventId };
    clients.add(client);
    setSseConnectedCount(clients.size);
    log(`[SSE] +client user=${req.user.id} role=${req.user.role} (total=${clients.size})`);

    // Best-effort replay for missed events after reconnect.
    if (Number.isInteger(lastEventId) && lastEventId > 0) {
        void replayMissedEvents(client, lastEventId);
    }

    // Heartbeat every 25 s — keeps connection alive through proxies / Passenger idle timeout
    const heartbeat = setInterval(() => {
        try {
            res.write(': ping\n\n');
            if (typeof res.flush === 'function') res.flush();
        } catch (_) { /* connection closed */ }
    }, 25000);

    // Cleanup on disconnect
    const cleanup = () => {
        clearInterval(heartbeat);
        clients.delete(client);
        recordSseDisconnect();
        setSseConnectedCount(clients.size);
        log(`[SSE] -client user=${req.user.id} (total=${clients.size})`);
    };
    req.on('close', cleanup);
    req.on('error', cleanup);
};

const ensureReplayStore = async () => {
    if (replayStoreReady) return;

    if (!replayStorePromise) {
        replayStorePromise = (async () => {
            await query(`
                CREATE TABLE IF NOT EXISTS event_bus_replay (
                    id BIGSERIAL PRIMARY KEY,
                    event_name VARCHAR(120) NOT NULL,
                    payload JSONB NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await query('CREATE INDEX IF NOT EXISTS idx_event_bus_replay_created_at ON event_bus_replay (created_at)');
            await query('CREATE INDEX IF NOT EXISTS idx_event_bus_replay_event_name ON event_bus_replay (event_name)');
            const maxIdResult = await query('SELECT COALESCE(MAX(id), 0) AS max_id FROM event_bus_replay');
            const persistedMaxId = Number(maxIdResult.rows?.[0]?.max_id || 0);
            if (persistedMaxId > eventCounter) {
                eventCounter = persistedMaxId;
            }
            replayStoreReady = true;
        })().catch((error) => {
            replayStorePromise = null;
            replayStoreReady = false;
            throw error;
        });
    }

    await replayStorePromise;
};

const persistReplayEvent = async (id, event, data) => {
    await ensureReplayStore();
    await query(
        `INSERT INTO event_bus_replay (id, event_name, payload)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [id, event, JSON.stringify(data)]
    );

    // Keep replay table bounded by retention window.
    void query(
        `DELETE FROM event_bus_replay
         WHERE created_at < NOW() - ($1 || ' days')::interval`,
        [String(replayRetentionDays)]
    ).catch(() => {});
};

const replayMissedEvents = async (client, lastEventId) => {
    try {
        await ensureReplayStore();
        const result = await query(
            `SELECT id, event_name, payload
             FROM event_bus_replay
             WHERE id > $1
             ORDER BY id ASC
             LIMIT $2`,
            [lastEventId, replayLimit]
        );

        for (const row of result.rows) {
            try {
                if (!isVisible(client, row.event_name, row.payload)) continue;
                const payload =
                    `id: ${row.id}\n` +
                    `event: ${row.event_name}\n` +
                    `data: ${JSON.stringify(row.payload)}\n\n`;
                client.res.write(payload);
                if (typeof client.res.flush === 'function') client.res.flush();
            } catch (_) {
                break;
            }
        }
    } catch (error) {
        log(`[SSE] Replay failed: ${error.message}`);
    }
};

const deliverToLocalClients = (event, data, incomingId) => {
    if (clients.size === 0) return 0;

    const id = Number.isInteger(incomingId) ? incomingId : ++eventCounter;
    if (Number.isInteger(incomingId) && incomingId > eventCounter) {
        eventCounter = incomingId;
    }

    const payload =
        `id: ${id}\n` +
        `event: ${event}\n` +
        `data: ${JSON.stringify(data)}\n\n`;

    let delivered = 0;
    for (const client of clients) {
        try {
            if (!isVisible(client, event, data)) continue;
            client.res.write(payload);
            if (typeof client.res.flush === 'function') client.res.flush();
            delivered++;
        } catch (err) {
            log(`[SSE] write failed user=${client.user?.id}: ${err.message}`);
            clients.delete(client);
            setSseConnectedCount(clients.size);
        }
    }

    return delivered;
};

const initRedisBroker = async () => {
    if (!brokerEnabled) return;
    if (!redisLib) {
        log('[SSE] Redis broker requested but redis package is unavailable. Falling back to local fanout.');
        return;
    }
    if (!redisUrl || redisUrl.includes('placeholder')) {
        log('[SSE] Redis broker requested but REDIS_URL is missing or set to placeholder. Falling back to local fanout.');
        return;
    }

    try {
        redisPub = redisLib.createClient({ url: redisUrl });
        redisSub = redisPub.duplicate();

        redisPub.on('error', (error) => {
            redisReady = false;
            log(`[SSE] Redis publish client error: ${error.message}`);
        });

        redisSub.on('error', (error) => {
            redisReady = false;
            log(`[SSE] Redis subscribe client error: ${error.message}`);
        });

        await redisPub.connect();
        await redisSub.connect();

        await redisSub.subscribe(redisChannel, (raw) => {
            try {
                const message = JSON.parse(raw);
                const delivered = deliverToLocalClients(message.event, message.data, message.id);
                log(`[SSE] broker event=${message.event} delivered=${delivered}/${clients.size}`);
            } catch (error) {
                log(`[SSE] Invalid broker message: ${error.message}`);
            }
        });

        redisReady = true;
        log(`[SSE] Redis broker enabled on channel ${redisChannel}`);
    } catch (error) {
        redisReady = false;
        log(`[SSE] Failed to initialize Redis broker: ${error.message}. Falling back to local fanout.`);
    }
};

void initRedisBroker();

// ───────────────────────────────────────────────
// Publish API — call from controllers
// ───────────────────────────────────────────────
const publish = (event, data) => {
    const id = ++eventCounter;

    if (brokerEnabled && redisReady && redisPub) {
        void redisPub
            .publish(redisChannel, JSON.stringify({ id, event, data, ts: Date.now() }))
            .catch((error) => {
                log(`[SSE] Redis publish failed: ${error.message}`);
            });
    } else {
        const delivered = deliverToLocalClients(event, data, id);
        log(`[SSE] event=${event} delivered=${delivered}/${clients.size}`);
    }

    void persistReplayEvent(id, event, data).catch((error) => {
        log(`[SSE] Replay persistence failed: ${error.message}`);
    });
};

const stats = () => ({
    connected: clients.size,
    counter: eventCounter,
});

module.exports = { sseHandler, publish, stats };
