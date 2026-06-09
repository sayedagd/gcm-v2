describe('metricsService', () => {
  let metricsService;

  beforeEach(() => {
    jest.resetModules();
    metricsService = require('../../../src/shared/services/metricsService');
    const state = metricsService._internal.state;
    state.requests.length = 0;
    state.dbQueries.length = 0;
    state.authFailures.length = 0;
    state.backupFailures.length = 0;
    state.sseDisconnects.length = 0;
    state.sseConnectedCurrent = 0;
    state.queueDepths = { ocr: null, backups: null, whatsapp: null };
    state.latestAlerts.length = 0;
  });

  test('captures request/error/latency metrics snapshot', () => {
    metricsService.observeRequest({ path: '/api/v1/ping', statusCode: 200, durationMs: 100 });
    metricsService.observeRequest({ path: '/api/v1/ping', statusCode: 500, durationMs: 300 });

    const snapshot = metricsService.getMetricsSnapshot();

    expect(snapshot.metrics.requestCount15m).toBe(2);
    expect(snapshot.metrics.requestErrors15m).toBe(1);
    expect(snapshot.metrics.avgLatencyMs15m).toBe(200);
    expect(snapshot.metrics.latencyP50Ms15m).toBe(100);
    expect(snapshot.metrics.latencyP95Ms15m).toBe(300);
    expect(snapshot.metrics.latencyP99Ms15m).toBe(300);
    expect(snapshot.metrics.errorRatePercent15m).toBe(50);
  });

  test('captures DB latency metrics', () => {
    metricsService.observeDbQuery({ durationMs: 10, queryTag: 'select_users', queryFingerprint: 'fp-a', isSlow: false });
    metricsService.observeDbQuery({ durationMs: 50, queryTag: 'select_companies', queryFingerprint: 'fp-b', isSlow: true });
    metricsService.observeDbQuery({ durationMs: 100, queryTag: 'upsert_trip', queryFingerprint: 'fp-b', isSlow: true });

    const snapshot = metricsService.getMetricsSnapshot();

    expect(snapshot.metrics.dbQueryCount15m).toBe(3);
    expect(snapshot.metrics.dbAvgLatencyMs15m).toBe(53.33);
    expect(snapshot.metrics.dbLatencyP50Ms15m).toBe(50);
    expect(snapshot.metrics.dbLatencyP95Ms15m).toBe(100);
    expect(snapshot.metrics.dbLatencyP99Ms15m).toBe(100);
    expect(snapshot.metrics.dbSlowQueryCount15m).toBe(2);
    expect(snapshot.metrics.dbTopSlowFingerprints15m).toEqual([
      { fingerprint: 'fp-b', count: 2 },
    ]);
  });

  test('tracks auth, backup and sse counters', () => {
    metricsService.recordAuthFailure({ code: 'AUTH_NO_TOKEN' });
    metricsService.recordBackupFailure({ message: 'boom' });
    metricsService.recordSseDisconnect();
    metricsService.setSseConnectedCount(7);
    metricsService.setQueueDepth({ queueName: 'ocr', depth: 4 });

    const snapshot = metricsService.getMetricsSnapshot();

    expect(snapshot.metrics.authFailures15m).toBe(1);
    expect(snapshot.metrics.backupFailures24h).toBe(1);
    expect(snapshot.metrics.sseDisconnects15m).toBe(1);
    expect(snapshot.metrics.sseConnectedCurrent).toBe(7);
    expect(snapshot.metrics.queueDepths.ocr).toBe(4);
  });

  test('triggers sse disconnect alert when threshold is exceeded', () => {
    const threshold = metricsService._internal.thresholds.sseDisconnects15m;

    for (let index = 0; index < threshold; index += 1) {
      metricsService.recordSseDisconnect();
    }

    const snapshot = metricsService.getMetricsSnapshot();

    const sseAlert = snapshot.activeAlerts.find((alert) => alert.name === 'sse_disconnects_15m');
    expect(sseAlert).toBeDefined();
    expect(sseAlert.value).toBe(threshold);
    expect(sseAlert.threshold).toBe(threshold);
    expect(sseAlert.window).toBe('15m');
  });
});
