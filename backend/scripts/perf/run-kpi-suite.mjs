#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const defaultBase = 'https://gcm-back.twision.agency';
const stagingBase = (process.env.KPI_STAGING_BACKEND_URL || defaultBase).replace(/\/$/, '');
const productionLikeBase = (process.env.KPI_PRODLIKE_BACKEND_URL || defaultBase).replace(/\/$/, '');
const endpointPath = process.env.KPI_ENDPOINT_PATH || '/api/v1/ping';
const durationSeconds = Number.parseInt(process.env.KPI_DURATION_SECONDS || '10', 10);
const concurrency = Number.parseInt(process.env.KPI_CONCURRENCY || '40', 10);
const timeoutMs = Number.parseInt(process.env.KPI_TIMEOUT_MS || '5000', 10);
const outputPath = process.env.KPI_OUTPUT_PATH || path.resolve(process.cwd(), '..', 'frontend-next', 'docs', 'kpi-execution-log.json');

const percentile = (samples, p) => {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
};

const runOneRequest = async (url) => {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return { ok: response.ok, status: response.status, durationMs: Date.now() - started };
  } catch {
    return { ok: false, status: 0, durationMs: Date.now() - started };
  } finally {
    clearTimeout(timeout);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runProfile = async (label, baseUrl) => {
  const url = `${baseUrl}${endpointPath}`;
  const finishAt = Date.now() + durationSeconds * 1000;
  const latencies = [];
  let total = 0;
  let success = 0;

  const workers = Array.from({ length: concurrency }).map(async (_, idx) => {
    await sleep(idx * 10);
    while (Date.now() < finishAt) {
      const result = await runOneRequest(url);
      total += 1;
      latencies.push(result.durationMs);
      if (result.ok) {
        success += 1;
      }
    }
  });

  await Promise.all(workers);

  return {
    label,
    endpoint: url,
    totalRequests: total,
    successRate: total > 0 ? Number(((success / total) * 100).toFixed(2)) : 0,
    p95Ms: percentile(latencies, 95),
    p99Ms: percentile(latencies, 99),
    maxMs: latencies.length > 0 ? Math.max(...latencies) : null,
  };
};

const main = async () => {
  const staging = await runProfile('staging', stagingBase);
  const productionLike = await runProfile('production-like', productionLikeBase);

  const report = {
    capturedAt: new Date().toISOString(),
    ordering: ['staging', 'production-like'],
    config: {
      endpointPath,
      durationSeconds,
      concurrency,
      timeoutMs,
    },
    results: {
      staging,
      productionLike,
    },
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

  console.log('[kpi] KPI suite completed in required order: staging then production-like.');
  console.log(`[kpi] Output: ${outputPath}`);
  console.log(`[kpi] staging successRate=${staging.successRate}% p95=${staging.p95Ms}ms p99=${staging.p99Ms}ms`);
  console.log(`[kpi] production-like successRate=${productionLike.successRate}% p95=${productionLike.p95Ms}ms p99=${productionLike.p99Ms}ms`);
};

main().catch((error) => {
  console.error(`[kpi] run failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
