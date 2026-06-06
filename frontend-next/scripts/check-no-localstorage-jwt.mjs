#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");

const TARGET_PATTERNS = [
  /localStorage\.(getItem|setItem|removeItem)\(\s*["']gcm_jwt_token["']/g,
  /window\.localStorage\.(getItem|setItem|removeItem)\(\s*["']gcm_jwt_token["']/g,
];

const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const failures = [];

const walk = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    const ext = path.extname(entry.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");

    for (const pattern of TARGET_PATTERNS) {
      pattern.lastIndex = 0;
      let match = pattern.exec(content);
      while (match) {
        const before = content.slice(0, match.index);
        const line = before.split("\n").length;
        failures.push({
          file: path.relative(projectRoot, fullPath),
          line,
          snippet: match[0],
        });
        match = pattern.exec(content);
      }
    }
  }
};

if (!fs.existsSync(srcRoot)) {
  console.error("check-no-localstorage-jwt: src/ directory not found.");
  process.exit(1);
}

walk(srcRoot);

if (failures.length > 0) {
  console.error("Found forbidden localStorage JWT usage:");
  for (const failure of failures) {
    console.error(`- ${failure.file}:${failure.line} -> ${failure.snippet}`);
  }
  process.exit(1);
}

console.log("OK: no localStorage JWT token usage found in src/");
