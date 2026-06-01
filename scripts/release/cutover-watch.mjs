#!/usr/bin/env node

const frontendBase = (process.env.CUTOVER_FRONTEND_BASE_URL || "").trim();
const backendBase = (process.env.CUTOVER_BACKEND_BASE_URL || "").trim();
const samples = Number.parseInt(process.env.CUTOVER_WATCH_SAMPLES || "5", 10);
const timeoutMs = Number.parseInt(process.env.CUTOVER_TIMEOUT_MS || "10000", 10);

if (!frontendBase || !backendBase) {
  console.error("[cutover-watch] Missing required env vars: CUTOVER_FRONTEND_BASE_URL, CUTOVER_BACKEND_BASE_URL");
  process.exit(1);
}

if (!Number.isFinite(samples) || samples < 1) {
  console.error("[cutover-watch] CUTOVER_WATCH_SAMPLES must be a positive integer.");
  process.exit(1);
}

const checks = [
  { name: "frontend landing", url: `${frontendBase}/landing`, expected: [200] },
  { name: "frontend login", url: `${frontendBase}/login`, expected: [200] },
  { name: "backend ping", url: `${backendBase}/api/v1/ping`, expected: [200] },
  { name: "backend sse protected", url: `${backendBase}/api/v1/events`, expected: [401] },
];

const withTimeout = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startedAt = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "manual" });
    const elapsedMs = Date.now() - startedAt;
    return { status: res.status, elapsedMs };
  } finally {
    clearTimeout(timer);
  }
};

const results = checks.map((check) => ({
  ...check,
  total: 0,
  ok: 0,
  fail: 0,
  latencyMs: [],
}));

for (let i = 0; i < samples; i += 1) {
  for (const result of results) {
    result.total += 1;
    try {
      const { status, elapsedMs } = await withTimeout(result.url);
      result.latencyMs.push(elapsedMs);
      if (result.expected.includes(status)) {
        result.ok += 1;
      } else {
        result.fail += 1;
      }
    } catch {
      result.fail += 1;
      result.latencyMs.push(timeoutMs);
    }
  }
}

let hasFailure = false;
for (const result of results) {
  const avgLatency = Math.round(result.latencyMs.reduce((acc, value) => acc + value, 0) / result.latencyMs.length);
  const errorRate = Number(((result.fail / result.total) * 100).toFixed(2));
  if (result.fail > 0) {
    hasFailure = true;
  }

  console.log(
    `[cutover-watch] ${result.name}: ok=${result.ok}/${result.total} fail=${result.fail} errorRate=${errorRate}% avgLatencyMs=${avgLatency}`,
  );
}

if (hasFailure) {
  console.error("[cutover-watch] Cutover watch detected failures.");
  process.exit(1);
}

console.log("[cutover-watch] All monitored checks are stable.");
