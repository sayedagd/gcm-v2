import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const packageJsonPath = path.join(root, 'package.json');

const forbiddenDependencies = ['pg', 'prisma', '@prisma/client', 'mysql', 'mysql2', 'mongoose', 'sequelize', 'knex'];
const forbiddenImportPatterns = [
  /from\s+['"]pg['"]/,
  /from\s+['"]mysql2?['"]/,
  /from\s+['"]@prisma\/client['"]/,
  /from\s+['"]mongoose['"]/,
  /from\s+['"]sequelize['"]/,
  /from\s+['"]knex['"]/,
  /from\s+['"]\.\.\/\.\.\/backend\//,
  /from\s+['"]@\/\.\.\/backend\//,
];

const failures = [];

if (!fs.existsSync(packageJsonPath)) {
  console.error('[api-boundary] package.json not found');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const allDeps = {
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {}),
};

for (const dep of forbiddenDependencies) {
  if (dep in allDeps) {
    failures.push(`forbidden database dependency found: ${dep}`);
  }
}

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      continue;
    }

    const relPath = path.relative(root, fullPath).replace(/\\/g, '/');
    const text = fs.readFileSync(fullPath, 'utf8');

    for (const pattern of forbiddenImportPatterns) {
      if (pattern.test(text)) {
        failures.push(`${relPath}: forbidden import boundary pattern ${pattern}`);
      }
    }

  }
};

if (fs.existsSync(srcDir)) {
  walk(srcDir);
}

if (failures.length > 0) {
  console.error('[api-boundary] FAIL');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('[api-boundary] PASS: frontend remains API-boundary only with no DB coupling.');
