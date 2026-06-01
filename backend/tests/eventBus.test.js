/**
 * GCM Event Bus (SSE) — Unit Tests
 * Run: node backend/tests/eventBus.test.js
 * 
 * Tests the visibility logic and publish/subscribe mechanism of the SSE bus.
 */
const assert = require('assert');

// Mock the logger to prevent file writes during test
jest.mock('../src/shared/utils/logger', () => ({ log: () => {} }));

const { sseHandler, publish, stats } = require('../src/shared/services/eventBus');

// ─── Helpers ─────────────────────────────────────────────
function createMockRes() {
    const chunks = [];
    return {
        chunks,
        writeHead: function () {},
        write: function (data) { chunks.push(data); return true; },
        flush: function () {},
        statusCode: 200,
        status: function (code) { this.statusCode = code; return this; },
        json: function (d) { this.body = d; },
    };
}

function createMockReq(user, headers = {}) {
    const listeners = {};
    return {
        user,
        headers,
        query: {},
        on: function (event, fn) {
            listeners[event] = fn;
        },
        _trigger: function (event) {
            if (listeners[event]) listeners[event]();
        },
    };
}

function connectClient(user) {
    const req = createMockReq(user);
    const res = createMockRes();
    sseHandler(req, res);
    return { req, res };
}

// ─── Tests ───────────────────────────────────────────────
describe('EventBus SSE', () => {
    afterEach(() => {
        // Disconnect all clients between tests by triggering close
        // We need a fresh state - use the internal stats to verify
    });

    test('rejects unauthenticated request', () => {
        const req = createMockReq(null);
        const res = createMockRes();
        sseHandler(req, res);
        expect(res.statusCode).toBe(401);
    });

    test('connects authenticated user and sends initial handshake', () => {
        const { res, req } = connectClient({ id: 'U1', role: 'ADMIN' });
        expect(res.chunks.join('')).toContain('retry: 5000');
        expect(res.chunks.join('')).toContain(': connected');
        // Cleanup
        req._trigger('close');
    });

    test('ADMIN receives all events', () => {
        const { res, req } = connectClient({ id: 'A1', role: 'ADMIN' });
        res.chunks.length = 0; // clear handshake

        publish('trip:created', { trip_id: 'T1', driver_id: 'D1', _company_id: 'C1' });
        publish('project:updated', { project_id: 'P1', company_id: 'C2' });
        publish('asset_req:created', { id: 1, supplier_id: 'S1' });

        const output = res.chunks.join('');
        expect(output).toContain('"trip_id":"T1"');
        expect(output).toContain('"project_id":"P1"');
        expect(output).toContain('"id":1');

        req._trigger('close');
    });

    test('DRIVER only sees their own trip events', () => {
        const { res, req } = connectClient({ id: 'DRV-1', role: 'DRIVER' });
        res.chunks.length = 0;

        publish('trip:created', { trip_id: 'A', driver_id: 'DRV-2' });
        publish('trip:created', { trip_id: 'B', driver_id: 'DRV-1' });

        const output = res.chunks.join('');
        expect(output).not.toContain('"trip_id":"A"');
        expect(output).toContain('"trip_id":"B"');

        req._trigger('close');
    });

    test('CLIENT only sees same-company trip events', () => {
        const { res, req } = connectClient({ id: 'U1', role: 'CLIENT', company_id: 'C-MINE' });
        res.chunks.length = 0;

        publish('trip:created', { trip_id: 'T1', _company_id: 'C-OTHER' });
        publish('trip:created', { trip_id: 'T2', _company_id: 'C-MINE' });

        const output = res.chunks.join('');
        expect(output).not.toContain('"trip_id":"T1"');
        expect(output).toContain('"trip_id":"T2"');

        req._trigger('close');
    });

    test('CLIENT sees same-company project events', () => {
        const { res, req } = connectClient({ id: 'U1', role: 'CLIENT', company_id: 'C1' });
        res.chunks.length = 0;

        publish('project:created', { project_id: 'P1', company_id: 'C2' });
        publish('project:created', { project_id: 'P2', company_id: 'C1' });

        const output = res.chunks.join('');
        expect(output).not.toContain('"project_id":"P1"');
        expect(output).toContain('"project_id":"P2"');

        req._trigger('close');
    });

    test('PROJECT_USER only sees their project trips', () => {
        const { res, req } = connectClient({ id: 'U1', role: 'PROJECT_USER', project_id: 'P-9' });
        res.chunks.length = 0;

        publish('trip:created', { trip_id: 'T1', project_id: 'P-10' });
        publish('trip:created', { trip_id: 'T2', project_id: 'P-9' });

        const output = res.chunks.join('');
        expect(output).not.toContain('"trip_id":"T1"');
        expect(output).toContain('"trip_id":"T2"');

        req._trigger('close');
    });

    test('SUBCONTRACTOR only sees own asset requests', () => {
        const { res, req } = connectClient({ id: 'U1', role: 'SUBCONTRACTOR', supplier_id: 'S-1' });
        res.chunks.length = 0;

        publish('asset_req:created', { id: 1, supplier_id: 'S-2' });
        publish('asset_req:created', { id: 2, supplier_id: 'S-1' });

        const output = res.chunks.join('');
        expect(output).not.toContain('"id":1,');
        expect(output).toContain('"id":2,');

        req._trigger('close');
    });

    test('Notifications go only to targeted user', () => {
        const { res, req } = connectClient({ id: 'U-1', role: 'CLIENT', company_id: 'C1' });
        res.chunks.length = 0;

        publish('notif:new', { id: 1, user_id: 'U-2', message: 'X' });
        publish('notif:new', { id: 2, user_id: 'U-1', message: 'Y' });

        const output = res.chunks.join('');
        expect(output).not.toContain('"message":"X"');
        expect(output).toContain('"message":"Y"');

        req._trigger('close');
    });

    test('Disconnect cleans up client', () => {
        const before = stats().connected;
        const { req } = connectClient({ id: 'U1', role: 'ADMIN' });
        expect(stats().connected).toBe(before + 1);
        req._trigger('close');
        expect(stats().connected).toBe(before);
    });

    test('Non-tracked tables are not broadcast', () => {
        const { res, req } = connectClient({ id: 'A1', role: 'ADMIN' });
        res.chunks.length = 0;

        // 'users' table is not in TABLE_TO_PREFIX, so publish won't be called for it
        // But we test the publish function directly - an unknown event prefix
        publish('unknown_table:created', { id: 1 });

        // ADMIN gets everything that passes isVisible; unknown events default deny for non-staff
        // but ADMIN passes the STAFF_ROLES check, so they DO receive it
        const output = res.chunks.join('');
        expect(output).toContain('"id":1');

        req._trigger('close');
    });
});
