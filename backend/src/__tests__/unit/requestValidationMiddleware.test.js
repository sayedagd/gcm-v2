const {
  validateAndSanitizeWritePayload,
  _internal,
} = require('../../shared/middleware/requestValidationMiddleware');

describe('requestValidationMiddleware', () => {
  test('sanitizePayload strips script tags from regular text fields', () => {
    const input = {
      name: '<script>alert("x")</script>Alpha',
      notes: '<b>Bold</b> content',
    };

    const output = _internal.sanitizePayload(input);

    expect(output.name).toBe('Alpha');
    expect(output.notes).toBe('Bold content');
  });

  test('sanitizePayload keeps URL-like fields unchanged', () => {
    const input = {
      logo_url: 'https://cdn.example.com/image.png?x=<tag>',
      avatar: 'https://cdn.example.com/avatar.png',
    };

    const output = _internal.sanitizePayload(input);

    expect(output.logo_url).toBe(input.logo_url);
    expect(output.avatar).toBe(input.avatar);
  });

  test('middleware rejects non-object JSON body for write requests', () => {
    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: ['bad'],
    };
    const res = {
      statusCode: 200,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };
    const next = jest.fn();

    validateAndSanitizeWritePayload(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('INVALID_BODY_SHAPE');
    expect(next).not.toHaveBeenCalled();
  });

  test('middleware sanitizes object body and calls next', () => {
    const req = {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: { description: '<img src=x onerror=alert(1)>Safe' },
    };
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      },
    };
    const next = jest.fn();

    validateAndSanitizeWritePayload(req, res, next);

    expect(req.body.description).toBe('Safe');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('middleware remains final authority even when x-skip-validation is sent', () => {
    const req = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-skip-validation': 'true',
      },
      body: { notes: '<script>alert(1)</script>Needs sanitize' },
    };
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      },
    };
    const next = jest.fn();

    validateAndSanitizeWritePayload(req, res, next);

    expect(req.body.notes).toBe('Needs sanitize');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
