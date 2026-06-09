import fs from "node:fs";
import path from "node:path";

const outputPath = process.env.CANARY_EVIDENCE_PATH
  || path.resolve(process.cwd(), "docs", "evidence", "canary-rollback-latest.json");

const ensureDir = (filePath) => {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const isFailureStatus = (statusCode) => {
  const code = Number.parseInt(String(statusCode), 10);
  return Number.isNaN(code) || code < 200 || code >= 400;
};

const evaluateCanaryGate = ({ frontendStatuses, backendStatuses }) => {
  const samples = frontendStatuses.length;
  if (samples === 0 || backendStatuses.length !== samples) {
    throw new Error("Invalid scenario input: frontend/backed samples must be equal and non-empty.");
  }

  const frontendFailures = frontendStatuses.filter(isFailureStatus).length;
  const backendFailures = backendStatuses.filter(isFailureStatus).length;
  const frontendFailureThreshold = Math.floor((samples + 1) / 2);
  const rollbackRequired = backendFailures > 0 || frontendFailures >= frontendFailureThreshold;

  return {
    samples,
    frontendStatuses,
    backendStatuses,
    frontendFailures,
    backendFailures,
    frontendFailureThreshold,
    rollbackRequired,
    rollbackReason: backendFailures > 0
      ? "backend-health-check-failure"
      : (frontendFailures >= frontendFailureThreshold ? "frontend-failure-threshold-exceeded" : null),
  };
};

const scenarios = [
  {
    id: "healthy-rollout",
    description: "No backend failures and frontend failure ratio below threshold.",
    expectedRollbackRequired: false,
    frontendStatuses: [200, 200, 302, 200],
    backendStatuses: [200, 200, 200, 200],
  },
  {
    id: "backend-failure-forces-rollback",
    description: "Any backend canary health check failure should force rollback.",
    expectedRollbackRequired: true,
    frontendStatuses: [200, 200, 200, 200],
    backendStatuses: [200, 503, 200, 200],
  },
  {
    id: "frontend-threshold-forces-rollback",
    description: "At least half of frontend checks failing should force rollback.",
    expectedRollbackRequired: true,
    frontendStatuses: [500, 502, 200, 200],
    backendStatuses: [200, 200, 200, 200],
  },
];

const startedAt = new Date().toISOString();

const results = scenarios.map((scenario) => {
  const evaluation = evaluateCanaryGate(scenario);
  const passed = evaluation.rollbackRequired === scenario.expectedRollbackRequired;

  return {
    id: scenario.id,
    description: scenario.description,
    expectedRollbackRequired: scenario.expectedRollbackRequired,
    observedRollbackRequired: evaluation.rollbackRequired,
    rollbackReason: evaluation.rollbackReason,
    metrics: {
      samples: evaluation.samples,
      frontendFailures: evaluation.frontendFailures,
      backendFailures: evaluation.backendFailures,
      frontendFailureThreshold: evaluation.frontendFailureThreshold,
    },
    statusCodes: {
      frontend: evaluation.frontendStatuses,
      backend: evaluation.backendStatuses,
    },
    pass: passed,
  };
});

const allPassed = results.every((result) => result.pass);

const evidence = {
  status: allPassed ? "success" : "failed",
  workflowReference: ".github/workflows/cutover-canary.yml",
  generatedAt: new Date().toISOString(),
  startedAt,
  scenarios: results,
  summary: {
    totalScenarios: results.length,
    passedScenarios: results.filter((result) => result.pass).length,
    rollbackValidationPassed: allPassed,
  },
};

ensureDir(outputPath);
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

if (!allPassed) {
  console.error("[canary-rollback] FAILED");
  console.error(JSON.stringify(evidence, null, 2));
  process.exit(1);
}

console.log(`[canary-rollback] Evidence written: ${outputPath}`);
console.log(JSON.stringify(evidence, null, 2));
