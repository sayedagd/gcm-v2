import fs from "node:fs";
import path from "node:path";

const inputPath = process.env.CONTRACT_DRIFT_INPUT_PATH
  || path.resolve(process.cwd(), "docs", "evidence", "contract-drift-history.json");
const outputPath = process.env.CONTRACT_DRIFT_OUTPUT_PATH
  || path.resolve(process.cwd(), "docs", "evidence", "contract-drift-trend-latest.json");
const requiredSprints = Number.parseInt(process.env.CONTRACT_DRIFT_REQUIRED_SPRINTS || "4", 10);

const ensureDir = (filePath) => {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const main = () => {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Contract drift history file not found: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  const history = Array.isArray(parsed.history) ? parsed.history : [];

  if (history.length < requiredSprints) {
    throw new Error(`At least ${requiredSprints} sprint records are required.`);
  }

  const recent = history.slice(-requiredSprints);
  const nonZero = recent.filter((item) => Number(item.unapprovedDriftCount || 0) > 0);
  const pass = nonZero.length === 0;

  const evidence = {
    status: pass ? "success" : "failed",
    generatedAt: new Date().toISOString(),
    source: {
      path: inputPath,
      totalSprints: history.length,
      requiredSprints,
    },
    evaluation: {
      recentSprints: recent,
      nonZeroUnapprovedDriftSprints: nonZero,
      zeroUnapprovedDriftTargetMet: pass,
    },
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  if (!pass) {
    console.error("[contract-drift] FAILED");
    console.error(JSON.stringify(evidence, null, 2));
    process.exit(1);
  }

  console.log(`[contract-drift] Evidence written: ${outputPath}`);
  console.log(JSON.stringify(evidence, null, 2));
};

try {
  main();
} catch (error) {
  const failure = {
    status: "failed",
    generatedAt: new Date().toISOString(),
    source: {
      path: inputPath,
      requiredSprints,
    },
    error: error instanceof Error ? error.message : String(error),
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(failure, null, 2)}\n`, "utf8");
  console.error("[contract-drift] FAILED");
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
}
