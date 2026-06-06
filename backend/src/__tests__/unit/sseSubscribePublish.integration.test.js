const { EventEmitter } = require('events');

describe('SSE subscribe/publish integration', () => {
  const connect = (sseHandler, user) => {
    const req = new EventEmitter();
    req.user = user;
    req.headers = {};

    const res = {
      writeHead: jest.fn(),
      write: jest.fn(),
      flush: jest.fn(),
      status: jest.fn(() => ({ json: jest.fn() })),
    };

    sseHandler(req, res);

    return {
      req,
      res,
      output: () => res.write.mock.calls.map((call) => call[0]).join(''),
      disconnect: () => req.emit('close'),
    };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('subscribes clients, publishes events, and enforces role visibility', () => {
    jest.doMock('../../shared/utils/logger', () => ({ log: jest.fn() }));
    jest.doMock('../../shared/services/metricsService', () => ({ recordSseDisconnect: jest.fn() }));

    const { sseHandler, publish, stats } = require('../../shared/services/eventBus');

    const admin = connect(sseHandler, { id: 'A-1', role: 'ADMIN' });
    const driverAllowed = connect(sseHandler, { id: 'D-1', role: 'DRIVER' });
    const driverDenied = connect(sseHandler, { id: 'D-2', role: 'DRIVER' });

    expect(stats().connected).toBe(3);

    publish('trip:updated', {
      trip_id: 'T-100',
      driver_id: 'D-1',
      _company_id: 'C-1',
      project_id: 'P-1',
      supplier_id: 'SUP-1',
    });

    expect(admin.output()).toContain('event: trip:updated');
    expect(driverAllowed.output()).toContain('event: trip:updated');
    expect(driverDenied.output()).not.toContain('event: trip:updated');

    admin.disconnect();
    driverAllowed.disconnect();
    driverDenied.disconnect();

    expect(stats().connected).toBe(0);
  });
});
