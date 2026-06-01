import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const featuresRoot = path.join(root, "src", "features");
const requiredDirs = ["ui", "hooks", "api", "model", "tests"];

if (!existsSync(featuresRoot)) {
  console.error("[features:check] src/features is missing.");
  process.exit(1);
}

const featureNames = readdirSync(featuresRoot).filter((entry) => {
  const fullPath = path.join(featuresRoot, entry);
  return statSync(fullPath).isDirectory();
});

const violations = [];

for (const feature of featureNames) {
  const featurePath = path.join(featuresRoot, feature);

  for (const requiredDir of requiredDirs) {
    const requiredPath = path.join(featurePath, requiredDir);
    if (!existsSync(requiredPath) || !statSync(requiredPath).isDirectory()) {
      violations.push(`feature \"${feature}\" missing required directory: ${requiredDir}`);
    }
  }
}

if (violations.length > 0) {
  console.error("[features:check] Convention violations found:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`[features:check] OK (${featureNames.length} feature folders validated).`);
