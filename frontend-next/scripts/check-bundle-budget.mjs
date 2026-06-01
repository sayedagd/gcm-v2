import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const chunksDir = path.join(projectRoot, ".next", "static", "chunks");

const toInt = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const maxChunkKb = toInt(process.env.BUNDLE_BUDGET_MAX_CHUNK_KB, 230);
const totalJsKb = toInt(process.env.BUNDLE_BUDGET_TOTAL_KB, 900);
const strict = process.env.BUNDLE_BUDGET_STRICT === "true";

const collectJsFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
};

if (!fs.existsSync(chunksDir)) {
  console.error("[bundle-budget] Missing .next/static/chunks. Run `npm run build` first.");
  process.exit(1);
}

const jsFiles = collectJsFiles(chunksDir);
const measured = jsFiles.map((filePath) => {
  const stat = fs.statSync(filePath);
  return {
    file: path.relative(projectRoot, filePath),
    bytes: stat.size,
    kb: Number((stat.size / 1024).toFixed(2)),
  };
});

const sorted = measured.sort((a, b) => b.bytes - a.bytes);
const largest = sorted[0] || { kb: 0, file: "<none>" };
const total = Number((sorted.reduce((sum, item) => sum + item.bytes, 0) / 1024).toFixed(2));

const errors = [];
if (largest.kb > maxChunkKb) {
  errors.push(`Largest JS chunk ${largest.file} is ${largest.kb}KB > budget ${maxChunkKb}KB.`);
}
if (total > totalJsKb) {
  errors.push(`Total JS chunks size is ${total}KB > budget ${totalJsKb}KB.`);
}

console.log(`[bundle-budget] Largest chunk: ${largest.file} (${largest.kb}KB)`);
console.log(`[bundle-budget] Total JS chunks: ${total}KB across ${sorted.length} files`);
console.log(`[bundle-budget] Budgets: maxChunk=${maxChunkKb}KB total=${totalJsKb}KB strict=${strict}`);

if (errors.length === 0) {
  console.log("[bundle-budget] PASS");
  process.exit(0);
}

for (const message of errors) {
  console.warn(`[bundle-budget] WARN: ${message}`);
}

if (strict) {
  console.error("[bundle-budget] FAIL (strict mode)");
  process.exit(1);
}

console.log("[bundle-budget] SOFT PASS (warnings only)");
