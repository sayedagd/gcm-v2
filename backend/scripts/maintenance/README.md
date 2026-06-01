# Maintenance Scripts

This folder contains backend operational maintenance tools.

## Active scripts

- `create_test_accounts.js`
  - Purpose: creates or updates standard role-based test users.
  - Command: `npm run maintenance:create-test-accounts`
- `inject_services.js`
  - Purpose: syncs baseline services/facilities seed constants.
  - Command: `npm run maintenance:inject-services`
- `reset_admin.js`
  - Purpose: reset the primary admin credentials.
  - Command: `npm run maintenance:reset-admin`
- `reset_for_testing.js`
  - Purpose: wipe transactional data while preserving service tree and one admin.
  - Command: `npm run maintenance:reset-testing`
- `wipe_data.js`
  - Purpose: wipe operational data while preserving users/services/config.
  - Command: `npm run maintenance:wipe-data`

## Archived scripts

Legacy one-off migration scripts are stored in `archive/` and are intentionally not exposed via npm scripts.
Only run them manually after reviewing schema compatibility.
