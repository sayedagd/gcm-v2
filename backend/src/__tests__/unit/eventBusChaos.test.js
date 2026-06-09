const flushAsync = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
};

const createMockRes = () => {
    const chunks = [];
    return {
        chunks,
        writeHead: jest.fn(),
        write: jest.fn((data) => {
            chunks.push(String(data));
            return true;
        }),
        flush: jest.fn(),
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
    };
};

const createMockReq = (user, headers = {}) => {
    const listeners = {};
    return {
        user,
        headers,
        on(event, cb) {
            listeners[event] = cb;
        },
        _trigger(event) {
            if (listeners[event]) listeners[event]();
        },
    };
};

const setupEventBusModule = ({ maxId = 0 } = {}) => {
    jest.resetModules();

    const state = {
        maxId,
        subscriber: null,
        pubHandlers: {},
        subHandlers: {},
    };

    const queryMock = jest.fn(async (sql, params) => {
        const text = String(sql);
        if (text.includes('SELECT COALESCE(MAX(id), 0) AS max_id FROM event_bus_replay')) {
            return { rows: [{ max_id: state.maxId }] };
        }
        if (text.includes('INSERT INTO event_bus_replay')) {
            state.maxId = Number(params[0]);
            return { rows: [] };
        }
        if (text.includes('FROM event_bus_replay') && text.includes('WHERE id >')) {
            return { rows: [] };
        }
        return { rows: [] };
    });

    const publishMock = jest.fn().mockResolvedValue(1);

    const pubClient = {
        on: jest.fn((event, handler) => {
            state.pubHandlers[event] = handler;
        }),
        connect: jest.fn().mockResolvedValue(undefined),
        duplicate: jest.fn(),
        publish: publishMock,
    };

    const subClient = {
        on: jest.fn((event, handler) => {
            state.subHandlers[event] = handler;
        }),
        connect: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn(async (_channel, handler) => {
            state.subscriber = handler;
        }),
    };

    pubClient.duplicate.mockReturnValue(subClient);

    jest.doMock('../../../database', () => ({ query: queryMock }));
    jest.doMock('../../../src/shared/utils/logger', () => ({ log: jest.fn() }));
    jest.doMock(
        'redis',
        () => ({
            createClient: jest.fn(() => pubClient),
        }),
        { virtual: true }
    );

    const eventBus = require('../../../src/shared/services/eventBus');

    return {
        eventBus,
        queryMock,
        publishMock,
        state,
    };
};

describe('EventBus realtime chaos checks', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'test',
            EVENT_BUS_BROKER: 'redis',
            REDIS_URL: 'redis://localhost:6379',
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('falls back to local fanout when broker disconnects, then still accepts broker messages after reconnect', async () => {
        const { eventBus, publishMock, state } = setupEventBusModule({ maxId: 20 });
        const { sseHandler, publish } = eventBus;
        await flushAsync();

        const req = createMockReq({ id: 'ADMIN-CHAOS', role: 'ADMIN' });
        const res = createMockRes();
        sseHandler(req, res);
        res.chunks.length = 0;

        publish('trip:updated', { trip_id: 'BROKER-1', driver_id: 'D-1', _company_id: 'C-1' });
        await flushAsync();

        expect(publishMock).toHaveBeenCalledTimes(1);
        expect(res.chunks.join('')).not.toContain('BROKER-1');

        state.pubHandlers.error(new Error('broker disconnected'));
        publish('trip:updated', { trip_id: 'LOCAL-2', driver_id: 'D-1', _company_id: 'C-1' });
        await flushAsync();

        expect(res.chunks.join('')).toContain('LOCAL-2');

        await state.subscriber(
            JSON.stringify({ id: 23, event: 'trip:updated', data: { trip_id: 'BROKER-3', driver_id: 'D-1', _company_id: 'C-1' } })
        );

        expect(res.chunks.join('')).toContain('BROKER-3');
        req._trigger('close');
    });

    test('continues replay id sequence across rolling restart', async () => {
        const firstInstance = setupEventBusModule({ maxId: 40 });
        const warmReq = createMockReq({ id: 'ADMIN-WARM', role: 'ADMIN' }, { 'last-event-id': '1' });
        const warmRes = createMockRes();
        firstInstance.eventBus.sseHandler(warmReq, warmRes);
        await flushAsync();

        firstInstance.eventBus.publish('trip:created', { trip_id: 'RST-1', driver_id: 'D-1', _company_id: 'C-1' });
        await flushAsync();
        warmReq._trigger('close');

        const firstInsert = firstInstance.queryMock.mock.calls.find((entry) =>
            String(entry[0]).includes('INSERT INTO event_bus_replay')
        );
        expect(firstInsert[1][0]).toBe(41);

        const secondInstance = setupEventBusModule({ maxId: 41 });
        const warmReq2 = createMockReq({ id: 'ADMIN-WARM-2', role: 'ADMIN' }, { 'last-event-id': '1' });
        const warmRes2 = createMockRes();
        secondInstance.eventBus.sseHandler(warmReq2, warmRes2);
        await flushAsync();

        secondInstance.eventBus.publish('trip:created', { trip_id: 'RST-2', driver_id: 'D-1', _company_id: 'C-1' });
        await flushAsync();
        warmReq2._trigger('close');

        const secondInsert = secondInstance.queryMock.mock.calls.find((entry) =>
            String(entry[0]).includes('INSERT INTO event_bus_replay')
        );
        expect(secondInsert[1][0]).toBe(42);
    });
});
