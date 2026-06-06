const bcrypt = require('bcryptjs');
const loginController = require('../../modules/auth/login/login.controller');

describe('login password verification', () => {
  const originalLegacyFallback = process.env.ALLOW_LEGACY_PASSWORD_FALLBACK;

  afterEach(() => {
    if (originalLegacyFallback === undefined) {
      delete process.env.ALLOW_LEGACY_PASSWORD_FALLBACK;
      return;
    }

    process.env.ALLOW_LEGACY_PASSWORD_FALLBACK = originalLegacyFallback;
  });

  test('accepts valid bcrypt password', async () => {
    const hash = await bcrypt.hash('secret123', 4);

    await expect(loginController.__internal.verifyPassword('secret123', hash)).resolves.toBe(true);
  });

  test('rejects invalid bcrypt password', async () => {
    const hash = await bcrypt.hash('secret123', 4);

    await expect(loginController.__internal.verifyPassword('wrong-pass', hash)).resolves.toBe(false);
  });

  test('keeps legacy plain-text comparison for backward compatibility', async () => {
    await expect(loginController.__internal.verifyPassword('plain-pass', 'plain-pass')).resolves.toBe(true);
    await expect(loginController.__internal.verifyPassword('wrong', 'plain-pass')).resolves.toBe(false);
  });

  test('rejects legacy plain-text passwords when fallback is disabled', async () => {
    process.env.ALLOW_LEGACY_PASSWORD_FALLBACK = 'false';

    await expect(loginController.__internal.verifyPassword('plain-pass', 'plain-pass')).resolves.toBe(false);
  });
});
