#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const backendBase = (process.env.PERF_10X_BACKEND_URL || process.env.PERF_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');
const endpointPath = process.env.PERF_10X_ENDPOINT || '/api/v1/ping';
const durationSeconds = Number.parseInt(process.env.PERF_10X_DURATION_SECONDS || '30', 10);
const concurrency = Number.parseInt(process.env.PERF_10X_CONCURRENCY || '50', 10);
const rampUpSeconds = Number.parseInt(process.env.PERF_10X_RAMP_UP_SECONDS || '5', 10);
const timeoutMs = Number.parseInt(process.env.PERF_10X_TIMEOUT_MS || '10000', 10);
const outputPath = process.env.PERF_10X_OUTPUT_PATH || path.resolve(process.cwd(), '..', 'frontend-next', 'docs', 'baseline-metrics.json');

const url = `${backendBase}${endpointPath}`;

const percentile = (samples, p) => {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
};

const runOneRequest = async () => {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const durationMs = Date.now() - started;
    return { ok: response.ok, status: response.status, durationMs };
  } catch {
    const durationMs = Date.now() - started;
    return { ok: false, status: 0, durationMs };
  } finally {
    clearTimeout(timeout);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  const startedAt = Date.now();
  const finishAt = startedAt + durationSeconds * 1000;
  const latencies = [];
  let total = 0;
  let success = 0;
  let failures = 0;
  let inFlight = 0;
  let maxInFlight = 0;

  const workers = Array.from({ length: concurrency }).map(async (_, idx) => {
    const workerDelay = idx < concurrency && rampUpSeconds > 0
      ? Math.floor((idx / Math.max(1, concurrency)) * rampUpSeconds * 1000)
      : 0;

    if (workerDelay > 0) {
      await sleep(workerDelay);
    }

    while (Date.now() < finishAt) {
      inFlight += 1;
      if (inFlight > maxInFlight) maxInFlight = inFlight;

      const result = await runOneRequest();
      inFlight -= 1;

      total += 1;
      latencies.push(result.durationMs);
      if (result.ok) {
        success += 1;
      } else {
        failures += 1;
      }
    }
  });

  await Promise.all(workers);

  const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
  const report = {
    capturedAt: new Date().toISOString(),
    profile: {
      name: '10x-load-profile',
      endpoint: url,
      durationSeconds,
      concurrency,
      rampUpSeconds,
      timeoutMs,
    },
    results: {
      totalRequests: total,
      successfulRequests: success,
      failedRequests: failures,
      successRate: total > 0 ? Number(((success / total) * 100).toFixed(2)) : 0,
      requestsPerSecond: Number((total / elapsedSeconds).toFixed(2)),
      latencyMs: {
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        p99: percentile(latencies, 99),
        max: latencies.length > 0 ? Math.max(...latencies) : null,
      },
      maxInFlight,
    },
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

  console.log('[perf] 10x load profile completed.');
  console.log(`[perf] Endpoint: ${url}`);
  console.log(`[perf] Total requests: ${report.results.totalRequests}`);
  console.log(`[perf] Success rate: ${report.results.successRate}%`);
  console.log(`[perf] p95 latency: ${report.results.latencyMs.p95}ms`);
  console.log(`[perf] p99 latency: ${report.results.latencyMs.p99}ms`);
  console.log(`[perf] Output: ${outputPath}`);

  if (report.results.successRate < 95) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(`[perf] 10x capture failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
