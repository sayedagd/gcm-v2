import fs from "node:fs";
import path from "node:path";

const packageJsonPath = path.join(process.cwd(), "package.json");
const strict = process.env.CRITICAL_DEPS_STRICT === "true";

const guardedDependencies = {
  "chart.js": "Large charting runtime; prefer lightweight server-rendered summaries where possible.",
  recharts: "Can significantly increase client bundle size on dashboards.",
  xlsx: "Heavy parser; keep server-side only when needed.",
  moment: "Large date library; prefer native Intl or smaller alternatives.",
  lodash: "Avoid full import footprint on critical routes.",
  "monaco-editor": "Very large editor payload; load only in isolated admin routes.",
  three: "Heavy 3D runtime; avoid on critical path.",
};

if (!fs.existsSync(packageJsonPath)) {
  console.error("[critical-deps] package.json not found.");
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const dependencies = packageJson.dependencies || {};

const flagged = Object.entries(guardedDependencies)
  .filter(([dep]) => Boolean(dependencies[dep]))
  .map(([dep, note]) => ({ dep, version: dependencies[dep], note }));

if (flagged.length === 0) {
  console.log("[critical-deps] PASS: no guarded heavy dependencies in production dependencies.");
  process.exit(0);
}

for (const item of flagged) {
  console.warn(`[critical-deps] WARN: ${item.dep}@${item.version} -> ${item.note}`);
}

if (strict) {
  console.error("[critical-deps] FAIL (strict mode)");
  process.exit(1);
}

console.log("[critical-deps] SOFT PASS (warnings only)");
