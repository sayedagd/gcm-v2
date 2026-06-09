# Startup Module Policy

## Purpose

Codify which backend modules must fail startup when unavailable versus which modules may degrade gracefully.

## Policy Classes

- `critical`: module load failure must abort process startup.
- `optional`: module load failure may fall back to degraded behavior with explicit logging.

## Critical Modules

- logger
- database
- migrationService
- errorMiddleware
- requestContextMiddleware
- systemController
- authMiddleware
- requestValidationMiddleware
- rateLimitPolicies
- login
- profile
- users
- companies
- projects
- services
- trips
- health
- backup
- settings

## Optional Modules

- backupService
- upload-storage
- whatsappService
- facilities
- requests
- notifications
- asset_requests
- vehicles
- drivers
- inventory
- dashboard
- exports
- landing
- contact
- store
- carbon
- shadi
- ai-analytics
- ocr
- suppliers
- project_services
- supplier_rates
- asset_service_links

## Runtime Behavior

- Critical module load path uses fail-fast startup behavior.
- Optional module load path keeps the process alive and exposes degraded route behavior.
- Undeclared module names default to optional-safe loading and emit a warning, so policy drift is visible in logs.

## Update Rule

When adding or renaming backend modules:

1. Add module classification to startup policy in app bootstrap.
2. Update this document in the same pull request.
3. Validate startup and targeted regression tests before merge.
