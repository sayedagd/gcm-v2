import fs from "node:fs";
import path from "node:path";

const runbooks = [
  "docs/backup-operations-runbook.md",
  "docs/restore-drill-runbook.md",
  "docs/background-job-retry-policy.md",
  "docs/realtime-broker-setup.md",
];

const outputPath = process.env.RUNBOOK_EVIDENCE_PATH
  || path.resolve(process.cwd(), "docs", "evidence", "runbook-ownership-latest.json");

const ensureDir = (filePath) => {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const hasOwnershipBlock = (content) => {
  const hasPrimary = /Primary owner:\s*.+/i.test(content);
  const hasSecondary = /Secondary owner:\s*.+/i.test(content);
  const hasLastReviewed = /Last reviewed:\s*\d{4}-\d{2}-\d{2}/i.test(content);
  return {
    hasPrimary,
    hasSecondary,
    hasLastReviewed,
    pass: hasPrimary && hasSecondary && hasLastReviewed,
  };
};

const results = runbooks.map((relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      path: relativePath,
      status: "missing",
      pass: false,
    };
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  const check = hasOwnershipBlock(content);
  return {
    path: relativePath,
    status: "present",
    ...check,
  };
});

const allPassed = results.every((result) => result.pass);

const evidence = {
  status: allPassed ? "success" : "failed",
  generatedAt: new Date().toISOString(),
  summary: {
    totalRunbooks: results.length,
    passedRunbooks: results.filter((item) => item.pass).length,
  },
  runbooks: results,
};

ensureDir(outputPath);
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

if (!allPassed) {
  console.error("[runbook-ownership] FAILED");
  console.error(JSON.stringify(evidence, null, 2));
  process.exit(1);
}

console.log(`[runbook-ownership] Evidence written: ${outputPath}`);
console.log(JSON.stringify(evidence, null, 2));
