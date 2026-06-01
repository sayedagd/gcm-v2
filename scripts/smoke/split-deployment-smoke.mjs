#!/usr/bin/env node

const frontendBase = (process.env.SMOKE_FRONTEND_BASE_URL || "").trim();
const backendBase = (process.env.SMOKE_BACKEND_BASE_URL || "").trim();
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS || "10000", 10);
const dryRun = process.env.SMOKE_DRY_RUN === "true";

if (!dryRun && (!frontendBase || !backendBase)) {
  console.error("[smoke] Missing required env vars: SMOKE_FRONTEND_BASE_URL and SMOKE_BACKEND_BASE_URL");
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
    name: "frontend landing page is reachable",
    run: async () => {
      const res = await withTimeout(`${frontendBase}/landing`);
      if (!res.ok) {
        throw new Error(`Expected 2xx, got ${res.status}`);
      }
    },
  },
  {
    name: "backend ping route is reachable",
    run: async () => {
      const res = await withTimeout(`${backendBase}/api/v1/ping`);
      if (!res.ok) {
        throw new Error(`Expected 2xx, got ${res.status}`);
      }
    },
  },
  {
    name: "frontend dashboard route is reachable or redirects",
    run: async () => {
      const res = await withTimeout(`${frontendBase}/client/dashboard`, {
        redirect: "manual",
      });
      if (!(res.ok || [301, 302, 303, 307, 308].includes(res.status))) {
        throw new Error(`Expected 2xx or redirect, got ${res.status}`);
      }
    },
  },
  {
    name: "auth login rejects invalid credentials",
    run: async () => {
      const res = await withTimeout(`${backendBase}/api/v1/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email: "smoke-invalid@example.com", password: "invalid" }),
      });

      if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
      }
    },
  },
  {
    name: "key CRUD route surface is protected",
    run: async () => {
      const res = await withTimeout(`${backendBase}/api/v1/companies`, {
        method: "POST",
        body: JSON.stringify({ company_name: "SMOKE-COMPANY" }),
      });
      if (res.status !== 401) {
        throw new Error(`Expected 401 for unauthenticated CRUD write, got ${res.status}`);
      }
    },
  },
  {
    name: "admin backup status is protected",
    run: async () => {
      const res = await withTimeout(`${backendBase}/api/v1/system/backup/status`);
      if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
      }

      const payload = await res.json().catch(() => null);
      if (!payload || payload.code !== "AUTH_NO_TOKEN") {
        throw new Error("Expected canonical auth error envelope with code AUTH_NO_TOKEN");
      }
    },
  },
  {
    name: "sse endpoint health is protected",
    run: async () => {
      const res = await withTimeout(`${backendBase}/api/v1/events`, {
        headers: {
          Accept: "text/event-stream",
        },
      });
      if (res.status !== 401) {
        throw new Error(`Expected 401 for unauthenticated SSE access, got ${res.status}`);
      }
    },
  },
];

if (dryRun) {
  console.log(`[smoke] DRY RUN: ${checks.length} checks configured.`);
  for (const check of checks) {
    console.log(`[smoke] CHECK - ${check.name}`);
  }
  process.exit(0);
}

const failures = [];

for (const check of checks) {
  try {
    await check.run();
    console.log(`[smoke] PASS - ${check.name}`);
  } catch (error) {
    failures.push({ name: check.name, error: error instanceof Error ? error.message : String(error) });
    console.error(`[smoke] FAIL - ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error(`[smoke] Completed with ${failures.length} failure(s).`);
  process.exit(1);
}

console.log(`[smoke] All ${checks.length} checks passed.`);
