#!/usr/bin/env node

const baseUrl = (process.env.RATE_LIMIT_BASE_URL || '').trim().replace(/\/$/, '');
const timeoutMs = Number.parseInt(process.env.RATE_LIMIT_TIMEOUT_MS || '10000', 10);
const totalRequests = Number.parseInt(process.env.RATE_LIMIT_TOTAL_REQUESTS || '60', 10);
const concurrency = Number.parseInt(process.env.RATE_LIMIT_CONCURRENCY || '12', 10);
const dryRun = process.env.RATE_LIMIT_DRY_RUN === 'true';

if (!dryRun && !baseUrl) {
  console.error('[rate-limit] Missing RATE_LIMIT_BASE_URL');
  process.exit(1);
}

const scenarios = [
  {
    name: 'auth-login-invalid-credentials-burst',
    method: 'POST',
    path: '/api/v1/auth/login',
    body: JSON.stringify({ email: 'ratelimit-smoke@example.com', password: 'invalid' }),
    expectedBeforeLimit: [400, 401],
    expectedLimited: 429,
  },
];

const withTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
};

const runScenario = async (scenario) => {
  const statuses = new Map();
  let firstLimitedAt = null;

  let currentIndex = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (currentIndex < totalRequests) {
      const requestIndex = currentIndex;
      currentIndex += 1;

      const response = await withTimeout(`${baseUrl}${scenario.path}`, {
        method: scenario.method,
        body: scenario.body,
      });

      const status = response.status;
      statuses.set(status, (statuses.get(status) || 0) + 1);

      if (status === scenario.expectedLimited && firstLimitedAt === null) {
        firstLimitedAt = requestIndex + 1;
      }
    }
  });

  await Promise.all(workers);

  const result = {
    scenario: scenario.name,
    totalRequests,
    concurrency,
    firstLimitedAt,
    statuses: Object.fromEntries([...statuses.entries()].sort((a, b) => a[0] - b[0])),
  };

  const hasExpectedLimited = (statuses.get(scenario.expectedLimited) || 0) > 0;
  const hasUnexpected5xx = [...statuses.keys()].some((status) => status >= 500);

  if (!hasExpectedLimited) {
    throw new Error(`No ${scenario.expectedLimited} responses observed under burst traffic`);
  }

  if (hasUnexpected5xx) {
    throw new Error('Unexpected 5xx responses observed during rate-limit test');
  }

  return result;
};

if (dryRun) {
  console.log('[rate-limit] DRY RUN');
  console.log(`[rate-limit] scenarios=${scenarios.length} totalRequests=${totalRequests} concurrency=${concurrency}`);
  for (const scenario of scenarios) {
    console.log(`[rate-limit] scenario=${scenario.name} endpoint=${scenario.method} ${scenario.path}`);
  }
  process.exit(0);
}

const started = Date.now();
const reports = [];

for (const scenario of scenarios) {
  const report = await runScenario(scenario);
  reports.push(report);
  console.log(`[rate-limit] PASS ${scenario.name}`);
  console.log(`[rate-limit] statuses ${JSON.stringify(report.statuses)}`);
  console.log(`[rate-limit] first429At ${report.firstLimitedAt}`);
}

const elapsedMs = Date.now() - started;
console.log(`[rate-limit] Completed ${reports.length} scenario(s) in ${elapsedMs}ms`);
