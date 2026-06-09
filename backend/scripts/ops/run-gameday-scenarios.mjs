import fs from "node:fs";
import path from "node:path";

const inputPath = process.env.GAMEDAY_INPUT_PATH
  || path.resolve(process.cwd(), "docs", "evidence", "gameday-scenarios-input.json");
const outputPath = process.env.GAMEDAY_OUTPUT_PATH
  || path.resolve(process.cwd(), "docs", "evidence", "gameday-scenarios-latest.json");

const ensureDir = (filePath) => {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const evaluateScenario = (scenario) => {
  const id = String(scenario.id || "").trim();
  const telemetry = scenario.telemetry || {};

  if (id === "api-outage") {
    const healthStatus = Number(telemetry.healthStatus || 0);
    const errorRate5xxPercent = Number(telemetry.errorRate5xxPercent || 0);
    const triggered = healthStatus >= 500 || errorRate5xxPercent >= 5;

    return {
      id,
      triggered,
      severity: triggered ? "sev1" : "none",
      actionPlan: [
        "Declare incident and freeze schema-changing deploys.",
        "Switch to degraded mode for non-critical endpoints.",
        "Validate DB and dependency health before restart.",
      ],
      pass: triggered,
    };
  }

  if (id === "broker-outage") {
    const redisConnected = Boolean(telemetry.redisConnected);
    const sseReconnectSpike = Boolean(telemetry.sseReconnectSpike);
    const triggered = !redisConnected && sseReconnectSpike;

    return {
      id,
      triggered,
      severity: triggered ? "sev2" : "none",
      actionPlan: [
        "Keep API online with local event fanout fallback.",
        "Restart broker clients and validate channel subscriptions.",
        "Validate Last-Event-ID replay catch-up after recovery.",
      ],
      pass: triggered,
    };
  }

  if (id === "worker-backlog") {
    const queueDepth = Number(telemetry.queueDepth || 0);
    const queueDepthThreshold = Number(telemetry.queueDepthThreshold || 100);
    const deadLetterRatePercent = Number(telemetry.deadLetterRatePercent || 0);
    const deadLetterThresholdPercent = Number(telemetry.deadLetterThresholdPercent || 0.5);
    const triggered = queueDepth >= queueDepthThreshold || deadLetterRatePercent >= deadLetterThresholdPercent;

    return {
      id,
      triggered,
      severity: triggered ? "sev2" : "none",
      actionPlan: [
        "Scale worker replicas and verify claim/ack health.",
        "Prioritize critical jobs and throttle non-critical producers.",
        "Triage dead-letter jobs by error class and retry policy.",
      ],
      pass: triggered,
    };
  }

  return {
    id: id || "unknown",
    triggered: false,
    severity: "none",
    actionPlan: [],
    pass: false,
    error: "Unsupported scenario id",
  };
};

const run = () => {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Game-day input file not found: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  const input = JSON.parse(raw);
  const scenarios = Array.isArray(input.scenarios) ? input.scenarios : [];

  if (scenarios.length === 0) {
    throw new Error("No game-day scenarios provided in input file.");
  }

  const results = scenarios.map(evaluateScenario);
  const allPassed = results.every((scenario) => scenario.pass);

  const evidence = {
    status: allPassed ? "success" : "failed",
    generatedAt: new Date().toISOString(),
    source: {
      path: inputPath,
      scenarios: scenarios.length,
    },
    scenarios: results,
    summary: {
      passedScenarios: results.filter((scenario) => scenario.pass).length,
      totalScenarios: results.length,
    },
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  if (!allPassed) {
    console.error("[gameday] FAILED");
    console.error(JSON.stringify(evidence, null, 2));
    process.exit(1);
  }

  console.log(`[gameday] Evidence written: ${outputPath}`);
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
  console.error("[gameday] FAILED");
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
}
