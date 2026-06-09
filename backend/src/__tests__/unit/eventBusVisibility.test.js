const { EventEmitter } = require('events');

jest.mock('../../../database', () => ({
  query: jest.fn(async (sql) => {
    const text = String(sql);
    if (text.includes('SELECT COALESCE(MAX(id), 0) AS max_id FROM event_bus_replay')) {
      return { rows: [{ max_id: 0 }] };
    }
    return { rows: [] };
  }),
}));

describe('eventBus role visibility', () => {
  const createClient = (sseHandler, user) => {
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
      close: () => req.emit('close'),
      output: () => res.write.mock.calls.map((call) => call[0]).join(''),
    };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('trip events are delivered only to visible roles', () => {
    jest.doMock('../../shared/utils/logger', () => ({ log: jest.fn() }));
    jest.doMock('../../shared/services/metricsService', () => ({ recordSseDisconnect: jest.fn() }));

    const { sseHandler, publish } = require('../../shared/services/eventBus');

    const admin = createClient(sseHandler, { id: 'ADMIN-1', role: 'ADMIN' });
    const driverMatch = createClient(sseHandler, { id: 'DRV-1', role: 'DRIVER' });
    const driverOther = createClient(sseHandler, { id: 'DRV-2', role: 'DRIVER' });

    publish('trip:created', {
      trip_id: 'T-1',
      driver_id: 'DRV-1',
      supplier_id: 'SUP-1',
      project_id: 'P-1',
      _company_id: 'C-1',
    });

    expect(admin.output()).toContain('event: trip:created');
    expect(driverMatch.output()).toContain('event: trip:created');
    expect(driverOther.output()).not.toContain('event: trip:created');

    admin.close();
    driverMatch.close();
    driverOther.close();
  });

  test('company and asset request events remain tenant-scoped', () => {
    jest.doMock('../../shared/utils/logger', () => ({ log: jest.fn() }));
    jest.doMock('../../shared/services/metricsService', () => ({ recordSseDisconnect: jest.fn() }));

    const { sseHandler, publish } = require('../../shared/services/eventBus');

    const companyUser = createClient(sseHandler, { id: 'U-1', role: 'COMPANY_USER', company_id: 'C-1' });
    const companyOther = createClient(sseHandler, { id: 'U-2', role: 'COMPANY_USER', company_id: 'C-2' });
    const subcontractor = createClient(sseHandler, { id: 'S-1', role: 'SUBCONTRACTOR', supplier_id: 'SUP-1' });
    const subcontractorOther = createClient(sseHandler, { id: 'S-2', role: 'SUBCONTRACTOR', supplier_id: 'SUP-2' });

    publish('company:updated', { company_id: 'C-1' });
    publish('asset_req:created', { id: 'AR-1', supplier_id: 'SUP-1' });

    expect(companyUser.output()).toContain('event: company:updated');
    expect(companyOther.output()).not.toContain('event: company:updated');
    expect(subcontractor.output()).toContain('event: asset_req:created');
    expect(subcontractorOther.output()).not.toContain('event: asset_req:created');

    companyUser.close();
    companyOther.close();
    subcontractor.close();
    subcontractorOther.close();
  });
});
