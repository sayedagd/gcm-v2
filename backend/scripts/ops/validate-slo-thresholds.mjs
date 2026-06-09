import fs from "node:fs";
import path from "node:path";

const kpiPath = process.env.SLO_KPI_INPUT_PATH
  || path.resolve(process.cwd(), "..", "frontend-next", "docs", "kpi-execution-log.json");
const dbPath = process.env.SLO_DB_INPUT_PATH
  || path.resolve(process.cwd(), "docs", "evidence", "db-saturation-input.json");
const outputPath = process.env.SLO_THRESHOLD_OUTPUT_PATH
  || path.resolve(process.cwd(), "docs", "evidence", "slo-threshold-validation-latest.json");

const ensureDir = (filePath) => {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const loadJson = (filePath, label) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const main = () => {
  const kpi = loadJson(kpiPath, "KPI log");
  const db = loadJson(dbPath, "DB saturation input");

  const staging = kpi.results?.staging || {};
  const productionLike = kpi.results?.productionLike || {};

  const apiChecks = {
    staging: {
      p95Ms: toNumber(staging.p95Ms),
      p99Ms: toNumber(staging.p99Ms),
      successRate: toNumber(staging.successRate),
    },
    productionLike: {
      p95Ms: toNumber(productionLike.p95Ms),
      p99Ms: toNumber(productionLike.p99Ms),
      successRate: toNumber(productionLike.successRate),
    },
  };

  const apiPass = {
    stagingLatency: apiChecks.staging.p95Ms <= 500 && apiChecks.staging.p99Ms <= 900,
    productionLikeLatency: apiChecks.productionLike.p95Ms <= 500 && apiChecks.productionLike.p99Ms <= 900,
    stagingErrorRate: (100 - apiChecks.staging.successRate) < 1,
    productionLikeErrorRate: (100 - apiChecks.productionLike.successRate) < 1,
  };

  const dbChecks = {
    cpuAvgPercent: toNumber(db.cpuAvgPercent),
    connectionWaitEventsPerMinute: toNumber(db.connectionWaitEventsPerMinute),
    slowQuerySharePercent: toNumber(db.slowQuerySharePercent),
  };

  const dbPass = {
    cpuWithinThreshold: dbChecks.cpuAvgPercent < 70,
    connectionWaitWithinThreshold: dbChecks.connectionWaitEventsPerMinute <= 1,
    slowQueryShareWithinThreshold: dbChecks.slowQuerySharePercent < 5,
  };

  const allPassed = [
    ...Object.values(apiPass),
    ...Object.values(dbPass),
  ].every(Boolean);

  const evidence = {
    status: allPassed ? "success" : "failed",
    generatedAt: new Date().toISOString(),
    source: {
      kpiPath,
      dbPath,
    },
    targets: {
      apiLatency: {
        p95MaxMs: 500,
        p99MaxMs: 900,
      },
      apiErrorRate: {
        maxPercent: 1,
      },
      dbSaturation: {
        cpuAvgMaxPercent: 70,
        connectionWaitEventsPerMinuteMax: 1,
        slowQuerySharePercentMax: 5,
      },
    },
    observed: {
      api: apiChecks,
      db: dbChecks,
    },
    pass: {
      ...apiPass,
      ...dbPass,
      allPassed,
    },
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  if (!allPassed) {
    console.error("[slo-thresholds] FAILED");
    console.error(JSON.stringify(evidence, null, 2));
    process.exit(1);
  }

  console.log(`[slo-thresholds] Evidence written: ${outputPath}`);
  console.log(JSON.stringify(evidence, null, 2));
};

try {
  main();
} catch (error) {
  const failure = {
    status: "failed",
    generatedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(failure, null, 2)}\n`, "utf8");
  console.error("[slo-thresholds] FAILED");
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
}
