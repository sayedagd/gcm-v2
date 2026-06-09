import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const outputPath = process.env.REALTIME_FAILOVER_OUTPUT_PATH
  || path.resolve(process.cwd(), "docs", "evidence", "realtime-failover-latest.json");

const ensureDir = (filePath) => {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const jestBin = path.resolve(process.cwd(), "node_modules", "jest", "bin", "jest.js");
const command = process.execPath;
const args = [
  jestBin,
  "--runInBand",
  "--forceExit",
  "src/__tests__/unit/eventBusChaos.test.js",
  "src/__tests__/unit/eventBusReplayPolicy.test.js",
];

const startedAt = new Date().toISOString();
const startedMs = Date.now();

const result = spawnSync(command, args, {
  cwd: process.cwd(),
  env: process.env,
  encoding: "utf8",
});

const endedAt = new Date().toISOString();
const durationMs = Date.now() - startedMs;

const evidence = {
  status: result.status === 0 && !result.error ? "success" : "failed",
  generatedAt: endedAt,
  startedAt,
  durationMs,
  command: `${command} ${args.join(" ")}`,
  exitCode: result.status,
  spawnError: result.error ? String(result.error.message || result.error) : null,
  stdoutTail: (result.stdout || "").split(/\r?\n/).slice(-40),
  stderrTail: (result.stderr || "").split(/\r?\n/).slice(-40),
  pass: {
    realtimeFailoverSuite: result.status === 0 && !result.error,
  },
};

ensureDir(outputPath);
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

if (result.status !== 0 || result.error) {
  console.error("[realtime-failover] FAILED");
  console.error(JSON.stringify(evidence, null, 2));
  process.exit(result.status ?? 1);
}

console.log(`[realtime-failover] Evidence written: ${outputPath}`);
console.log(JSON.stringify(evidence, null, 2));
