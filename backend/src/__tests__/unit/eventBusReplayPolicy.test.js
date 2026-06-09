jest.mock('../../../database', () => ({
    query: jest.fn(),
}));

describe('event bus replay persistence and retention policy', () => {
    const originalEnv = process.env;

    const setupEventBus = () => {
        jest.resetModules();
        process.env = {
            ...originalEnv,
            NODE_ENV: 'test',
            EVENT_BUS_BROKER: 'local',
            EVENT_BUS_REPLAY_LIMIT: '2',
            EVENT_BUS_REPLAY_RETENTION_DAYS: '3',
        };

        let eventBusModule;
        let queryMock;

        jest.isolateModules(() => {
            ({ query: queryMock } = require('../../../database'));
            queryMock.mockReset();
            queryMock.mockImplementation((sql) => {
                const text = String(sql);
                if (text.includes('SELECT COALESCE(MAX(id), 0) AS max_id FROM event_bus_replay')) {
                    return Promise.resolve({ rows: [{ max_id: 0 }] });
                }
                if (text.includes('FROM event_bus_replay') && text.includes('WHERE id >')) {
                    return Promise.resolve({
                        rows: [
                            { id: 8, event_name: 'trip:updated', payload: { trip_id: 'T-8' } },
                            { id: 9, event_name: 'trip:updated', payload: { trip_id: 'T-9' } },
                        ],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            eventBusModule = require('../../shared/services/eventBus');
        });

        return {
            eventBus: eventBusModule,
            queryMock,
        };
    };

    beforeEach(() => {
        process.env = {
            ...originalEnv,
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('persists replay events and prunes old events by retention days', async () => {
        const { eventBus, queryMock } = setupEventBus();
        const { publish } = eventBus;

        publish('trip:created', { trip_id: 'T-100' });
        await new Promise((resolve) => setImmediate(resolve));
        await new Promise((resolve) => setImmediate(resolve));

        const calls = queryMock.mock.calls.map((entry) => ({
            sql: String(entry[0]),
            params: entry[1],
        }));

        expect(calls.some((entry) => entry.sql.includes('INSERT INTO event_bus_replay'))).toBe(true);
        expect(
            calls.some(
                (entry) =>
                    entry.sql.includes('DELETE FROM event_bus_replay') &&
                    Array.isArray(entry.params) &&
                    entry.params[0] === '3'
            )
        ).toBe(true);
    });

    test('replays missed events using configured replay limit on reconnect', async () => {
        const { eventBus, queryMock } = setupEventBus();
        const { sseHandler } = eventBus;
        const writes = [];
        const listeners = {};

        const req = {
            user: { id: 'admin-1', role: 'ADMIN', company_id: null, supplier_id: null },
            headers: { 'last-event-id': '7' },
            on: jest.fn((event, handler) => {
                listeners[event] = handler;
            }),
        };

        const res = {
            setHeader: jest.fn(),
            writeHead: jest.fn(),
            flushHeaders: jest.fn(),
            write: jest.fn((chunk) => writes.push(String(chunk))),
            flush: jest.fn(),
        };

        sseHandler(req, res);
        await new Promise((resolve) => setImmediate(resolve));
        await new Promise((resolve) => setImmediate(resolve));

        expect(
            queryMock.mock.calls.some((entry) => {
                const sql = String(entry[0]);
                const params = entry[1];
                return (
                    sql.includes('FROM event_bus_replay') &&
                    sql.includes('WHERE id > $1') &&
                    Array.isArray(params) &&
                    params[0] === 7 &&
                    params[1] === 2
                );
            })
        ).toBe(true);

        expect(writes.some((chunk) => chunk.includes('id: 8'))).toBe(true);
        expect(writes.some((chunk) => chunk.includes('id: 9'))).toBe(true);

        if (typeof listeners.close === 'function') {
            listeners.close();
        }
    });
});
