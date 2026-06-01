#!/usr/bin/env node

const baselineBase = (process.env.PARITY_BASELINE_FRONTEND_URL || "").trim();
const nextBase = (process.env.PARITY_NEXT_BASE_URL || "").trim();
const backendBase = (process.env.PARITY_BACKEND_BASE_URL || "").trim();
const timeoutMs = Number.parseInt(process.env.PARITY_TIMEOUT_MS || "10000", 10);
const dryRun = process.env.PARITY_DRY_RUN === "true";

const routeChecks = [
  { route: "/landing" },
  { route: "/login" },
  { route: "/unauthorized" },
  { route: "/home" },
  { route: "/client/dashboard", allowBaselineOkNextRedirect: true },
  { route: "/subcontractor/dashboard", allowBaselineOkNextRedirect: true },
  { route: "/driver/map", allowBaselineOkNextRedirect: true },
];

if (!dryRun && (!baselineBase || !nextBase || !backendBase)) {
  console.error("[parity] Missing required env vars: PARITY_BASELINE_FRONTEND_URL, PARITY_NEXT_BASE_URL, PARITY_BACKEND_BASE_URL");
  process.exit(1);
}

if (dryRun) {
  console.log(`[parity] DRY RUN: ${routeChecks.length} route checks configured.`);
  routeChecks.forEach(({ route }) => console.log(`[parity] ROUTE - ${route}`));
  process.exit(0);
}

const classifyStatus = (status) => {
  if (status >= 200 && status < 300) return "ok";
  if ([301, 302, 303, 307, 308].includes(status)) return "redirect";
  return "error";
};

const withTimeout = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal, redirect: "manual" });
  } finally {
    clearTimeout(timer);
  }
};

const failures = [];

for (const { route, allowBaselineOkNextRedirect = false } of routeChecks) {
  try {
    const [baselineRes, nextRes] = await Promise.all([
      withTimeout(`${baselineBase}${route}`),
      withTimeout(`${nextBase}${route}`),
    ]);

    const baselineClass = classifyStatus(baselineRes.status);
    const nextClass = classifyStatus(nextRes.status);

    if (baselineClass !== nextClass) {
      if (allowBaselineOkNextRedirect && baselineClass === "ok" && nextClass === "redirect") {
        console.log(`[parity] PASS - ${route}: accepted auth boundary hardening (${baselineRes.status}/${nextRes.status})`);
        continue;
      }

      failures.push({
        route,
        reason: `classification mismatch baseline=${baselineClass} (${baselineRes.status}) next=${nextClass} (${nextRes.status})`,
      });
      console.error(`[parity] FAIL - ${route}: baseline=${baselineRes.status} next=${nextRes.status}`);
      continue;
    }

    console.log(`[parity] PASS - ${route}: ${baselineRes.status}/${nextRes.status}`);
  } catch (error) {
    failures.push({ route, reason: error instanceof Error ? error.message : String(error) });
    console.error(`[parity] FAIL - ${route}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

try {
  const backendRes = await withTimeout(`${backendBase}/api/v1/ping`);
  if (!backendRes.ok) {
    failures.push({ route: "/api/v1/ping", reason: `backend status ${backendRes.status}` });
    console.error(`[parity] FAIL - backend ping: ${backendRes.status}`);
  } else {
    console.log("[parity] PASS - backend ping");
  }
} catch (error) {
  failures.push({ route: "/api/v1/ping", reason: error instanceof Error ? error.message : String(error) });
  console.error(`[parity] FAIL - backend ping: ${error instanceof Error ? error.message : String(error)}`);
}

if (failures.length > 0) {
  console.error(`[parity] Completed with ${failures.length} failure(s).`);
  process.exit(1);
}

console.log("[parity] All checks passed.");
