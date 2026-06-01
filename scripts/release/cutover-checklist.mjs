#!/usr/bin/env node

const frontendBase = (process.env.CUTOVER_FRONTEND_BASE_URL || "").trim();
const backendBase = (process.env.CUTOVER_BACKEND_BASE_URL || "").trim();
const fallbackFrontend = (process.env.CUTOVER_FALLBACK_FRONTEND_URL || "").trim();
const timeoutMs = Number.parseInt(process.env.CUTOVER_TIMEOUT_MS || "10000", 10);

if (!frontendBase || !backendBase || !fallbackFrontend) {
  console.error(
    "[cutover] Missing required env vars: CUTOVER_FRONTEND_BASE_URL, CUTOVER_BACKEND_BASE_URL, CUTOVER_FALLBACK_FRONTEND_URL",
  );
  process.exit(1);
}

const withTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
};

const checks = [
  {
    name: "frontend custom domain is reachable",
    run: async () => {
      const res = await withTimeout(`${frontendBase}/landing`);
      if (!res.ok) {
        throw new Error(`Expected 2xx, got ${res.status}`);
      }
    },
  },
  {
    name: "backend custom domain ping is reachable",
    run: async () => {
      const res = await withTimeout(`${backendBase}/api/v1/ping`);
      if (!res.ok) {
        throw new Error(`Expected 2xx, got ${res.status}`);
      }
    },
  },
  {
    name: "vercel fallback frontend redirects to custom domain",
    run: async () => {
      const res = await withTimeout(`${fallbackFrontend}/login`, {
        redirect: "manual",
      });

      if (res.status !== 308) {
        throw new Error(`Expected 308, got ${res.status}`);
      }

      const location = res.headers.get("location") || "";
      const expectedPrefix = `${frontendBase}/login`;
      if (!location.startsWith(expectedPrefix)) {
        throw new Error(`Expected Location to start with ${expectedPrefix}, got ${location || "<empty>"}`);
      }
    },
  },
  {
    name: "invalid auth credentials are rejected",
    run: async () => {
      const res = await withTimeout(`${backendBase}/api/v1/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email: "cutover-invalid@example.com", password: "invalid" }),
      });
      if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
      }
    },
  },
  {
    name: "admin backup status remains protected",
    run: async () => {
      const res = await withTimeout(`${backendBase}/api/v1/system/backup/status`);
      if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
      }
    },
  },
];

const failures = [];
for (const check of checks) {
  try {
    await check.run();
    console.log(`[cutover] PASS - ${check.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({ name: check.name, error: message });
    console.error(`[cutover] FAIL - ${check.name}: ${message}`);
  }
}

if (failures.length > 0) {
  console.error(`[cutover] Completed with ${failures.length} failure(s).`);
  process.exit(1);
}

console.log(`[cutover] All ${checks.length} checks passed.`);
