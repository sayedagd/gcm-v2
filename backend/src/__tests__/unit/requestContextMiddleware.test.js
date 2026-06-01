const { requestContext } = require('../../../src/shared/middleware/requestContextMiddleware');

jest.mock('../../../src/shared/utils/logger', () => ({
  logEvent: jest.fn(),
}));

const { logEvent } = require('../../../src/shared/utils/logger');

describe('requestContext middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses incoming x-correlation-id and sets response header', () => {
    const req = {
      method: 'GET',
      url: '/api/v1/ping',
      originalUrl: '/api/v1/ping',
      headers: { 'x-correlation-id': 'incoming-123' },
      user: null,
    };

    const finishHandlers = [];
    const res = {
      locals: {},
      statusCode: 200,
      setHeader: jest.fn(),
      on: jest.fn((event, handler) => {
        if (event === 'finish') {
          finishHandlers.push(handler);
        }
      }),
    };

    const next = jest.fn();
    requestContext(req, res, next);

    expect(req.correlationId).toBe('incoming-123');
    expect(res.locals.correlationId).toBe('incoming-123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-Id', 'incoming-123');
    expect(next).toHaveBeenCalled();

    finishHandlers.forEach((fn) => fn());
    expect(logEvent).toHaveBeenCalledWith('http_request', expect.objectContaining({
      correlationId: 'incoming-123',
      method: 'GET',
      path: '/api/v1/ping',
      statusCode: 200,
    }));
  });

  test('generates correlation ID when missing', () => {
    const req = {
      method: 'POST',
      url: '/api/v1/auth/login',
      originalUrl: '/api/v1/auth/login',
      headers: {},
      user: null,
    };

    const res = {
      locals: {},
      statusCode: 401,
      setHeader: jest.fn(),
      on: jest.fn(),
    };

    const next = jest.fn();
    requestContext(req, res, next);

    expect(typeof req.correlationId).toBe('string');
    expect(req.correlationId.length).toBeGreaterThan(0);
    expect(res.locals.correlationId).toBe(req.correlationId);
    expect(next).toHaveBeenCalled();
  });
});
