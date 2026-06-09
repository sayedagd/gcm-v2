import fs from "node:fs";
import path from "node:path";

const defaultInputPath = path.resolve(process.cwd(), "docs", "evidence", "slo-burn-input.json");
const inputPath = process.env.SLO_BURN_INPUT_PATH || defaultInputPath;
const outputPath = process.env.SLO_BURN_OUTPUT_PATH
  || path.resolve(process.cwd(), "docs", "evidence", "slo-burn-rate-latest.json");

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

const run = () => {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`SLO input file not found: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  const input = JSON.parse(raw);

  const service = input.service || "api";
  const errorBudgetPercent = toNumber(input.errorBudgetPercent, 0.5);
  const budgetFraction = errorBudgetPercent / 100;
  if (budgetFraction <= 0) {
    throw new Error("errorBudgetPercent must be greater than zero.");
  }

  const windows = {
    last5m: toNumber(input.windows?.last5m?.errorRatePercent, 0),
    last30m: toNumber(input.windows?.last30m?.errorRatePercent, 0),
    last1h: toNumber(input.windows?.last1h?.errorRatePercent, 0),
    last6h: toNumber(input.windows?.last6h?.errorRatePercent, 0),
  };

  const burnRates = Object.fromEntries(
    Object.entries(windows).map(([windowName, errorRatePercent]) => {
      const errorRateFraction = errorRatePercent / 100;
      const burnRate = errorRateFraction / budgetFraction;
      return [windowName, Number(burnRate.toFixed(2))];
    })
  );

  const rollbackSignals = {
    immediate: burnRates.last5m >= 14.4 && burnRates.last1h >= 6,
    urgent: burnRates.last30m >= 6 && burnRates.last6h >= 3,
    warning: burnRates.last30m >= 3,
  };

  const rollbackRequired = rollbackSignals.immediate || rollbackSignals.urgent;

  const evidence = {
    status: "success",
    generatedAt: new Date().toISOString(),
    source: {
      path: inputPath,
      service,
      errorBudgetPercent,
    },
    windows,
    burnRates,
    thresholds: {
      immediate: { fastWindow: 14.4, slowWindow: 6 },
      urgent: { mediumWindow: 6, longWindow: 3 },
      warning: { mediumWindow: 3 },
    },
    rollbackSignals,
    decision: {
      rollbackRequired,
      reason: rollbackSignals.immediate
        ? "burn-rate-immediate"
        : (rollbackSignals.urgent ? "burn-rate-urgent" : (rollbackSignals.warning ? "burn-rate-warning" : "healthy")),
    },
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`[slo-burn-rate] Evidence written: ${outputPath}`);
  console.log(JSON.stringify(evidence, null, 2));
};

try {
  run();
} catch (error) {
  const failure = {
    status: "failed",
    generatedAt: new Date().toISOString(),
    source: {
      path: inputPath,
    },
    error: error instanceof Error ? error.message : String(error),
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(failure, null, 2)}\n`, "utf8");
  console.error("[slo-burn-rate] FAILED");
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
}
