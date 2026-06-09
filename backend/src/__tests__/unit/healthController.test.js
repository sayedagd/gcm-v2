describe('health controller tiers', () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));

  beforeEach(() => {
    jest.resetModules();
    json.mockReset();
    status.mockReset();
    status.mockReturnValue({ json });
  });

  test('liveness returns ok payload', () => {
    jest.doMock('../../../src/shared/controllers/systemController', () => ({
      getHealth: jest.fn(),
      getPing: jest.fn(),
    }));

    jest.doMock('../../../src/shared/services/metricsService', () => ({
      getMetricsSnapshot: jest.fn(() => ({ metrics: { requestCount15m: 0 } })),
    }));

    jest.doMock('../../../database', () => ({
      query: jest.fn(),
    }));

    const controller = require('../../../src/modules/infrastructure/health/health.controller');
    const res = { json };

    controller.liveness({}, res);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ok',
      type: 'liveness',
    }));
  });

  test('readiness returns 200 when DB is reachable', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });

    jest.doMock('../../../src/shared/controllers/systemController', () => ({
      getHealth: jest.fn(),
      getPing: jest.fn(),
    }));

    jest.doMock('../../../src/shared/services/metricsService', () => ({
      getMetricsSnapshot: jest.fn(() => ({ metrics: { requestCount15m: 0 } })),
    }));

    jest.doMock('../../../database', () => ({ query }));

    const controller = require('../../../src/modules/infrastructure/health/health.controller');
    const res = { status };

    await controller.readiness({}, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(query).toHaveBeenCalled();
  });

  test('readiness returns 503 when DB check fails', async () => {
    const query = jest.fn().mockRejectedValue(new Error('db down'));

    jest.doMock('../../../src/shared/controllers/systemController', () => ({
      getHealth: jest.fn(),
      getPing: jest.fn(),
    }));

    jest.doMock('../../../src/shared/services/metricsService', () => ({
      getMetricsSnapshot: jest.fn(() => ({ metrics: { requestCount15m: 0 } })),
    }));

    jest.doMock('../../../database', () => ({ query }));

    const controller = require('../../../src/modules/infrastructure/health/health.controller');
    const res = { status };

    await controller.readiness({}, res);

    expect(status).toHaveBeenCalledWith(503);
  });

  test('dependencies returns 200 when dependencies are healthy', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });

    jest.doMock('../../../src/shared/controllers/systemController', () => ({
      getHealth: jest.fn(),
      getPing: jest.fn(),
    }));

    jest.doMock('../../../src/shared/services/metricsService', () => ({
      getMetricsSnapshot: jest.fn(() => ({ metrics: { requestCount15m: 1 } })),
    }));

    jest.doMock('../../../database', () => ({ query }));

    const controller = require('../../../src/modules/infrastructure/health/health.controller');
    const res = { status };

    await controller.dependencies({}, res);

    expect(status).toHaveBeenCalledWith(200);
  });
});
