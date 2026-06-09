import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');

const ALLOWED_PREFIXES = ['/api/v1/', '/api/write/'];
const IGNORE_FILE_SUFFIXES = ['.test.ts', '.test.tsx', '.test.js', '.test.jsx', '.spec.ts', '.spec.tsx', '.spec.js', '.spec.jsx'];
const endpointPattern = /['"`](\/api\/[^'"`\s]+)['"`]/g;

const shouldIgnoreFile = (filePath) => {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/e2e/')) return true;
  return IGNORE_FILE_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
};

const isAllowedEndpoint = (endpoint) => {
  if (endpoint === '/api/v1' || endpoint === '/api/write') {
    return true;
  }

  return ALLOWED_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
};

const violations = [];

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
    if (shouldIgnoreFile(relPath)) {
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const matches = content.matchAll(endpointPattern);

    for (const match of matches) {
      const endpoint = match[1];
      if (!isAllowedEndpoint(endpoint)) {
        violations.push(`${relPath}: disallowed endpoint ${endpoint}`);
      }
    }
  }
};

if (fs.existsSync(srcDir)) {
  walk(srcDir);
}

if (violations.length > 0) {
  console.error('[api-v1-policy] FAIL');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('[api-v1-policy] PASS: all scanned frontend endpoints use /api/v1/* or /api/write/*');
