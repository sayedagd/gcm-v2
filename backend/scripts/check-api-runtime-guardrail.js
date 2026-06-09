const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, '..', 'app.js');
const appSource = fs.readFileSync(appPath, 'utf8');

const failures = [];

const requiredGuard = /const\s+shouldRunInProcessJobs\s*=\s*processRole\s*===\s*'worker'\s*;/;
if (!requiredGuard.test(appSource)) {
    failures.push('API runtime guard missing: shouldRunInProcessJobs must be worker-only.');
}

const forbiddenLegacyGuard = /ENABLE_IN_PROCESS_JOBS\s*===\s*'true'\s*\|\|\s*processRole\s*===\s*'worker'/;
if (forbiddenLegacyGuard.test(appSource)) {
    failures.push('Legacy in-process job guard detected: API role must not be allowed to run background jobs.');
}

const forbiddenHeavyRuntimeCalls = [
    'processPendingWhatsAppJob(',
    'claimPendingOcrJob(',
    'processPendingBackupJobs(',
];

for (const callSnippet of forbiddenHeavyRuntimeCalls) {
    if (appSource.includes(callSnippet)) {
        failures.push(`Forbidden heavy-runtime call found in app.js: ${callSnippet}`);
    }
}

if (failures.length > 0) {
    console.error('[runtime-guardrail] FAIL');
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log('[runtime-guardrail] PASS: API runtime guardrails are enforced.');
