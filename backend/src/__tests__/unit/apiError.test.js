const { buildErrorPayload, sendError } = require('../../../src/shared/utils/apiError');

describe('apiError trace propagation', () => {
  test('buildErrorPayload includes traceId when provided', () => {
    const payload = buildErrorPayload({
      code: 'AUTH_NO_TOKEN',
      error: 'Not authorized, no token',
      traceId: 'trace-123',
    });

    expect(payload.traceId).toBe('trace-123');
    expect(payload.errorInfo.traceId).toBe('trace-123');
  });

  test('sendError falls back to res.locals correlationId', () => {
    const res = {
      locals: { correlationId: 'corr-xyz' },
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    };

    sendError(res, 401, {
      code: 'AUTH_NO_TOKEN',
      error: 'Not authorized, no token',
    });

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      traceId: 'corr-xyz',
      errorInfo: expect.objectContaining({
        traceId: 'corr-xyz',
      }),
    }));
  });
});
