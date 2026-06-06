describe('login controller payload validation', () => {
  test('returns 400 for invalid login payload', async () => {
    jest.resetModules();
    jest.doMock('../../shared/utils/logger', () => ({ log: jest.fn() }));

    const loginController = require('../../modules/auth/login/login.controller');

    const req = {
      body: {
        email: 'not-an-email',
        password: '',
      },
    };

    const res = {
      status: jest.fn(),
      json: jest.fn(),
    };
    res.status.mockReturnValue(res);

    await loginController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AUTH_VALIDATION_FAILED',
    }));
  });
});
