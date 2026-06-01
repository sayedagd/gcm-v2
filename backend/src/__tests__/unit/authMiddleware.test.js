/**
 * GCM ERP - Backend Unit Tests
 * Phase 1.1: Auth Middleware Tests
 */

const jwt = require('jsonwebtoken');
const { protect } = require('../../../src/shared/middleware/authMiddleware');

// Mock jwt
jest.mock('jsonwebtoken');
jest.mock('../../../src/shared/utils/logger');

describe('protect()', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      headers: {},
      cookies: {},
      query: {},
      path: '/api/test'
    };
    mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn()
    };
    mockNext = jest.fn();

    // Set JWT_SECRET
    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('returns 401 if no Authorization header present', async () => {
    await protect(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Not authorized, no token'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('extracts token from Bearer header', async () => {
    const mockDecoded = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'ADMIN',
      company_id: 'comp-123'
    };

    mockReq.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockReturnValue(mockDecoded);

    await protect(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test_secret', { algorithms: ['HS256'] });
    expect(mockReq.user).toEqual(mockDecoded);
    expect(mockNext).toHaveBeenCalled();
  });

  test('returns 401 if token is expired', async () => {
    mockReq.headers.authorization = 'Bearer expired-token';
    jwt.verify.mockImplementation(() => {
      throw new Error('Token expired');
    });

    await protect(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Not authorized, token failed'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('returns 401 if token signature is invalid', async () => {
    mockReq.headers.authorization = 'Bearer invalid-token';
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    await protect(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('returns 401 if JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET;
    mockReq.headers.authorization = 'Bearer some-token';

    await protect(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Server configuration error'
    });
  });

  test('attaches req.user on valid token', async () => {
    const mockDecoded = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'ADMIN',
      company_id: 'comp-123',
      supplier_id: 'supp-123'
    };

    mockReq.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockReturnValue(mockDecoded);

    await protect(mockReq, mockRes, mockNext);

    expect(mockReq.user).toEqual(mockDecoded);
    expect(mockNext).toHaveBeenCalled();
  });

  test('extracts correct role, company_id, supplier_id from token payload', async () => {
    const mockDecoded = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'DRIVER',
      company_id: 'comp-456',
      supplier_id: 'supp-789'
    };

    mockReq.headers.authorization = 'Bearer driver-token';
    jwt.verify.mockReturnValue(mockDecoded);

    await protect(mockReq, mockRes, mockNext);

    expect(mockReq.user.role).toBe('DRIVER');
    expect(mockReq.user.company_id).toBe('comp-456');
    expect(mockReq.user.supplier_id).toBe('supp-789');
  });

  test('extracts token from HttpOnly cookie (gcm_jwt)', async () => {
    const mockDecoded = { id: 'user-123', role: 'CLIENT' };

    mockReq.cookies = { gcm_jwt: 'cookie-token' };
    jwt.verify.mockReturnValue(mockDecoded);

    await protect(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('cookie-token', 'test_secret', { algorithms: ['HS256'] });
    expect(mockReq.user).toEqual(mockDecoded);
    expect(mockNext).toHaveBeenCalled();
  });

  test('extracts token from query param for SSE endpoint', async () => {
    const mockDecoded = { id: 'user-123', role: 'CLIENT' };

    mockReq.query = { token: 'query-token' };
    mockReq.path = '/api/events';
    jwt.verify.mockReturnValue(mockDecoded);

    await protect(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('query-token', 'test_secret', { algorithms: ['HS256'] });
    expect(mockReq.user).toEqual(mockDecoded);
    expect(mockNext).toHaveBeenCalled();
  });

  test('does NOT allow query param token for non-SSE endpoints', async () => {
    mockReq.query = { token: 'query-token' };
    mockReq.path = '/api/companies'; // Not SSE endpoint

    await protect(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('prioritizes Bearer header over cookie', async () => {
    const mockDecoded = { id: 'user-123', role: 'ADMIN' };

    mockReq.headers.authorization = 'Bearer header-token';
    mockReq.cookies = { gcm_jwt: 'cookie-token' };
    jwt.verify.mockReturnValue(mockDecoded);

    await protect(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('header-token', 'test_secret', { algorithms: ['HS256'] });
  });
});