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
const { recordSseDisconnect } = require('./metricsService');

/** @type {Set<{res, user, lastEventId}>} */
const clients = new Set();
let eventCounter = 0;

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

// ───────────────────────────────────────────────
// SSE HTTP handler
// ───────────────────────────────────────────────
const sseHandler = (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authorized' });
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
    log(`[SSE] +client user=${req.user.id} role=${req.user.role} (total=${clients.size})`);

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
        log(`[SSE] -client user=${req.user.id} (total=${clients.size})`);
    };
    req.on('close', cleanup);
    req.on('error', cleanup);
};

// ───────────────────────────────────────────────
// Publish API — call from controllers
// ───────────────────────────────────────────────
const publish = (event, data) => {
    if (clients.size === 0) return;
    const id = ++eventCounter;
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
        }
    }
    log(`[SSE] event=${event} delivered=${delivered}/${clients.size}`);
};

const stats = () => ({
    connected: clients.size,
    counter: eventCounter,
});

module.exports = { sseHandler, publish, stats };
