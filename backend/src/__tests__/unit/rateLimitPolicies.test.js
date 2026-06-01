const { buildRateLimitPolicies } = require('../../shared/middleware/rateLimitPolicies');

describe('rateLimitPolicies', () => {
  const envKeys = [
    'RL_GLOBAL_WINDOW_MS',
    'RL_GLOBAL_MAX',
    'RL_AUTH_WINDOW_MS',
    'RL_AUTH_MAX',
    'RL_PUBLIC_WRITE_WINDOW_MS',
    'RL_PUBLIC_WRITE_MAX',
    'RL_SSE_WINDOW_MS',
    'RL_SSE_MAX',
    'RL_AI_WINDOW_MS',
    'RL_AI_MAX',
    'RL_ADMIN_WINDOW_MS',
    'RL_ADMIN_MAX',
  ];

  const clearEnv = () => {
    for (const key of envKeys) {
      delete process.env[key];
    }
  };

  beforeEach(() => {
    clearEnv();
  });

  afterEach(() => {
    clearEnv();
  });

  test('uses expected default limit tiers', () => {
    const policies = buildRateLimitPolicies();

    expect(policies.limits.global.max).toBe(1000);
    expect(policies.limits.auth.max).toBe(20);
    expect(policies.limits.publicWrite.max).toBe(40);
    expect(policies.limits.sse.max).toBe(30);
    expect(policies.limits.ai.max).toBe(120);
    expect(policies.limits.admin.max).toBe(30);
  });

  test('respects env override values when valid', () => {
    process.env.RL_AUTH_MAX = '12';
    process.env.RL_PUBLIC_WRITE_MAX = '25';
    process.env.RL_ADMIN_MAX = '9';

    const policies = buildRateLimitPolicies();

    expect(policies.limits.auth.max).toBe(12);
    expect(policies.limits.publicWrite.max).toBe(25);
    expect(policies.limits.admin.max).toBe(9);
  });
});
