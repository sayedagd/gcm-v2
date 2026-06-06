const bcrypt = require('bcryptjs');

describe('login legacy password migration', () => {
  test('rehashes and persists plain-text password after successful legacy login', async () => {
    process.env.JWT_SECRET = 'test-jwt-secret';

    const dbQuery = jest.fn(async (sql, params) => {
      if (sql.startsWith('SELECT * FROM users WHERE email = $1')) {
        return {
          rows: [
            {
              id: 'U-1',
              email: 'legacy@gcm.local',
              password: 'legacy-pass',
              role: 'ADMIN',
              company_id: null,
              project_id: null,
              supplier_id: null,
            },
          ],
        };
      }

      if (sql.startsWith('UPDATE users SET password = $1 WHERE id = $2')) {
        expect(params[1]).toBe('U-1');
        expect(typeof params[0]).toBe('string');
        expect(params[0].startsWith('$2')).toBe(true);
        await expect(bcrypt.compare('legacy-pass', params[0])).resolves.toBe(true);
        return { rowCount: 1 };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    jest.resetModules();
    jest.doMock('../../../database', () => ({ query: dbQuery }));
    jest.doMock('../../shared/utils/logger', () => ({ log: jest.fn() }));

    const loginController = require('../../modules/auth/login/login.controller');

    const req = {
      body: {
        email: 'legacy@gcm.local',
        password: 'legacy-pass',
      },
    };

    const res = {
      cookie: jest.fn(),
      json: jest.fn(),
      status: jest.fn(),
    };
    res.status.mockReturnValue(res);

    await loginController.login(req, res);

    expect(dbQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE email = $1', ['legacy@gcm.local']);
    expect(dbQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET password = $1 WHERE id = $2'), expect.any(Array));
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.cookie).toHaveBeenCalled();

    const responsePayload = res.json.mock.calls[0][0];
    expect(responsePayload.password).toBeUndefined();
  });

  test('returns 401 for invalid legacy credential and does not persist upgrade', async () => {
    process.env.JWT_SECRET = 'test-jwt-secret';

    const dbQuery = jest.fn(async (sql) => {
      if (sql.startsWith('SELECT * FROM users WHERE email = $1')) {
        return {
          rows: [
            {
              id: 'U-2',
              email: 'legacy2@gcm.local',
              password: 'legacy-pass',
              role: 'ADMIN',
            },
          ],
        };
      }

      if (sql.startsWith('UPDATE users SET password = $1 WHERE id = $2')) {
        throw new Error('Password upgrade should not run for invalid credentials');
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    jest.resetModules();
    jest.doMock('../../../database', () => ({ query: dbQuery }));
    jest.doMock('../../shared/utils/logger', () => ({ log: jest.fn() }));

    const loginController = require('../../modules/auth/login/login.controller');

    const req = {
      body: {
        email: 'legacy2@gcm.local',
        password: 'wrong-pass',
      },
    };

    const res = {
      cookie: jest.fn(),
      json: jest.fn(),
      status: jest.fn(),
    };
    res.status.mockReturnValue(res);

    await loginController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(dbQuery).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ error: 'Auth Failed' });
  });
});
