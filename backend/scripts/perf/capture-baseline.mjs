#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer';

const frontendBase = (process.env.PERF_FRONTEND_URL || 'https://gcm.twision.agency').replace(/\/$/, '');
const backendBase = (process.env.PERF_BACKEND_URL || frontendBase).replace(/\/$/, '');
const timeoutMs = Number.parseInt(process.env.PERF_TIMEOUT_MS || '30000', 10);
const outputPath = process.env.PERF_OUTPUT_PATH || path.resolve(process.cwd(), '..', 'frontend-next', 'docs', 'baseline-metrics.json');
const apiLatencyUrl = (process.env.PERF_API_LATENCY_URL || `${backendBase}/api/v1/ping`).replace(/\/$/, '');

const nowIso = new Date().toISOString();

const withAbort = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const started = Date.now();
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const durationMs = Date.now() - started;
    return { response, durationMs };
  } finally {
    clearTimeout(timer);
  }
};

const captureNavigationMetrics = async (page, url) => {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: timeoutMs });
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) {
      return null;
    }

    const navEntry = nav;
    const interactiveMs = Math.max(0, navEntry.domInteractive);
    const hydrationProxyMs = Math.max(0, navEntry.loadEventEnd - navEntry.domContentLoadedEventEnd);

    return {
      ttfbMs: Math.round(navEntry.responseStart),
      domContentLoadedMs: Math.round(navEntry.domContentLoadedEventEnd),
      interactiveMs: Math.round(interactiveMs),
      hydrationProxyMs: Math.round(hydrationProxyMs),
      totalLoadMs: Math.round(navEntry.loadEventEnd),
    };
  });
};

const captureRouteTransitionMs = async (page) => {
  await page.goto(`${frontendBase}/landing`, { waitUntil: 'networkidle0', timeout: timeoutMs });

  const hasStoreLink = await page.$('a[href="/store"]');
  const started = Date.now();

  if (hasStoreLink) {
    await Promise.all([
      page.waitForFunction(() => window.location.pathname === '/store', { timeout: timeoutMs }),
      hasStoreLink.click(),
    ]);
  } else {
    await page.goto(`${frontendBase}/store`, { waitUntil: 'networkidle0', timeout: timeoutMs });
  }

  await page.waitForNetworkIdle({ idleTime: 500, timeout: timeoutMs });
  return Date.now() - started;
};

const main = async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);

    const landingMetrics = await captureNavigationMetrics(page, `${frontendBase}/landing`);
    if (!landingMetrics) {
      throw new Error('navigation timing entry was not available for landing page');
    }

    const routeTransitionMs = await captureRouteTransitionMs(page);

    const pingResult = await withAbort(apiLatencyUrl);

    const result = {
      capturedAt: nowIso,
      frontendBase,
      backendBase,
      apiLatencyUrl,
      metrics: {
        ttfbMs: landingMetrics.ttfbMs,
        hydrationProxyMs: landingMetrics.hydrationProxyMs,
        routeTransitionMs,
        apiLatencyMs: pingResult.durationMs,
        apiStatusCode: pingResult.response.status,
        supporting: {
          domContentLoadedMs: landingMetrics.domContentLoadedMs,
          interactiveMs: landingMetrics.interactiveMs,
          totalLoadMs: landingMetrics.totalLoadMs,
        },
      },
    };

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2));

    console.log('[perf] Baseline metrics captured.');
    console.log(`[perf] Output: ${outputPath}`);
    console.log(`[perf] TTFB: ${result.metrics.ttfbMs}ms`);
    console.log(`[perf] Hydration proxy: ${result.metrics.hydrationProxyMs}ms`);
    console.log(`[perf] Route transition: ${result.metrics.routeTransitionMs}ms`);
    console.log(`[perf] API latency: ${result.metrics.apiLatencyMs}ms`);
    console.log(`[perf] API status: ${result.metrics.apiStatusCode}`);

    if (result.metrics.apiStatusCode >= 400) {
      console.warn('[perf] API latency endpoint returned non-2xx status. Set PERF_API_LATENCY_URL for an environment-specific endpoint.');
    }
  } finally {
    await browser.close();
  }
};

main().catch((error) => {
  console.error(`[perf] Baseline capture failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
