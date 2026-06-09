import fs from "fs";
import path from "path";

const projectRoot = path.resolve(process.cwd());

const read = (relativePath) => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`[cache-strategy] Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
};

const failures = [];

try {
  const internalLayoutPath = "src/app/(internal)/layout.tsx";
  const internalLayout = read(internalLayoutPath);
  if (!/export const dynamic\s*=\s*["']force-dynamic["']/.test(internalLayout)) {
    failures.push(`${internalLayoutPath}: must export dynamic = \"force-dynamic\"`);
  }
  if (!/export const fetchCache\s*=\s*["']force-no-store["']/.test(internalLayout)) {
    failures.push(`${internalLayoutPath}: must export fetchCache = \"force-no-store\"`);
  }

  const publicRoutePaths = [
    "src/app/landing/page.tsx",
    "src/app/store/page.tsx",
    "src/app/home/page.tsx",
    "src/app/page.tsx",
  ];

  for (const routePath of publicRoutePaths) {
    const routeSource = read(routePath);
    if (/export const dynamic\s*=\s*["']force-dynamic["']/.test(routeSource)) {
      failures.push(`${routePath}: public route must not force dynamic rendering`);
    }
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}

if (failures.length > 0) {
  console.error("[cache-strategy] FAIL:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[cache-strategy] PASS: route cache strategy policy is enforced.");
