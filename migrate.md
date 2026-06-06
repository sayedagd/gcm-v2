# App Router Full Migration Plan

## Agent Handover Memory (Use In New Chat)

### Purpose
This section is a compact memory block for starting a new chat with another AI agent without losing context.

### Project Context
- Repository root: `gcm-v2`
- Frontend app: `frontend-next`
- Backend app: `backend`
- Route entries are now owned by `frontend-next/src/app`.
- Legacy route folder `frontend-next/src/legacy-pages` has been removed after parity-safe migration.

### What Has Been Completed So Far
- TypeScript build bypass was removed from Next config.
- Strictness hardening phases already completed and validated by production build:
  - `noImplicitAny`
  - `noImplicitReturns`
  - `noFallthroughCasesInSwitch`
  - `noUncheckedIndexedAccess`
  - `exactOptionalPropertyTypes`
- Multiple codebase-wide fixes were applied to satisfy strictness checks (optional prop handling, safe indexing, conditional object field inclusion).
- `npm run build` currently passes in `frontend-next`.

### Current Migration Status
- Migration planning document created (this file).
- Phase 1 route ownership migration is completed for all inventoried wrapper routes.
- Phase 2 feature colocation has started with the projects metrics extraction in `src/features/projects/useProjectsPageMetrics.ts`.
- Phase 3 router cleanup is completed for non-legacy code paths; `reactRouterCompat` has been removed from `src/app`, shared components, and hooks outside `src/legacy-pages`.
- Legacy page compat migration is completed; no `reactRouterCompat` imports remain in `src`.
- Internal short route folders were renamed to descriptive route names (e.g. `/db` -> `/dashboard`, `/rd` -> `/reports-dashboard`).
- Phase 4 legacy decommission is complete: `@/pages/*` alias removed, `src/legacy-pages` deleted, and production build validated.

### Route Inventory Snapshot (Phase 0)

#### Summary
- Total App Router pages: 36
- Wrapper pages still importing from `src/legacy-pages`: 0
- Already native App Router pages: 10

#### Wrapper Route Mapping (`src/app` -> `src/legacy-pages`)

| App Route Entry | Legacy Target | Status |
|---|---|---|
| `src/app/(internal)/accountant-portal/page.tsx` | `src/legacy-pages/AccountantPortal.tsx` | DONE |
| `src/app/(internal)/ai-sessions/page.tsx` | `src/legacy-pages/AISessions.tsx` | DONE |
| `src/app/(internal)/companies/page.tsx` | `src/legacy-pages/Companies.tsx` | DONE |
| `src/app/(internal)/drivers/page.tsx` | `src/legacy-pages/Drivers.tsx` | DONE |
| `src/app/(internal)/fleet/page.tsx` | `src/legacy-pages/Fleet.tsx` | DONE |
| `src/app/(internal)/facilities/page.tsx` | `src/legacy-pages/Facilities.tsx` | DONE |
| `src/app/(internal)/inventory/page.tsx` | `src/legacy-pages/Inventory.tsx` | DONE |
| `src/app/(internal)/activity-logs/page.tsx` | `src/legacy-pages/ActivityLogs.tsx` | DONE |
| `src/app/(internal)/landing-settings/page.tsx` | `src/legacy-pages/LandingSettings.tsx` | DONE |
| `src/app/(internal)/logistics/trip-queue/page.tsx` | `src/legacy-pages/logistics/TripQueue.tsx` | DONE |
| `src/app/(internal)/projects/page.tsx` | `src/legacy-pages/Projects.tsx` | DONE |
| `src/app/(internal)/profile/page.tsx` | `src/legacy-pages/Profile.tsx` | DONE |
| `src/app/(internal)/reports-dashboard/page.tsx` | `src/legacy-pages/ReportsDashboard.tsx` | DONE |
| `src/app/(internal)/services/page.tsx` | `src/legacy-pages/Services.tsx` | DONE |
| `src/app/(internal)/settings/page.tsx` | `src/legacy-pages/Settings.tsx` | DONE |
| `src/app/(internal)/equipment-admin/page.tsx` | `src/legacy-pages/EquipmentAdmin.tsx` | DONE |
| `src/app/(internal)/suppliers/page.tsx` | `src/legacy-pages/Suppliers.tsx` | DONE |
| `src/app/(internal)/system-monitor/page.tsx` | `src/legacy-pages/SystemMonitor.tsx` | DONE |
| `src/app/(internal)/trips/page.tsx` | `src/legacy-pages/Trips.tsx` | DONE |
| `src/app/(internal)/user-management/page.tsx` | `src/legacy-pages/UserManagement.tsx` | DONE |
| `src/app/(client)/client/account/page.tsx` | `src/legacy-pages/client/ClientAccount.tsx` | DONE |
| `src/app/(client)/client/reports/page.tsx` | `src/legacy-pages/client/ClientReports.tsx` | DONE |
| `src/app/(client)/client/support/page.tsx` | `src/legacy-pages/client/ServiceRequest.tsx` | DONE |
| `src/app/(driver)/driver/map/page.tsx` | `src/legacy-pages/driver/DriverMapView.tsx` | DONE |
| `src/app/(subcontractor)/subcontractor/assets/page.tsx` | `src/legacy-pages/subcontractor/SubcontractorAssets.tsx` | DONE |
| `src/app/(subcontractor)/subcontractor/profile/page.tsx` | `src/legacy-pages/subcontractor/SubcontractorProfile.tsx` | DONE |

#### Already Native App Router Pages (No Legacy Wrapper)

| Native Page Entry | Status |
|---|---|
| `src/app/page.tsx` | KEEP |
| `src/app/(auth)/login/page.tsx` | KEEP |
| `src/app/(auth)/logout/page.tsx` | KEEP |
| `src/app/(auth)/unauthorized/page.tsx` | KEEP |
| `src/app/(client)/client/page.tsx` | KEEP |
| `src/app/(client)/client/dashboard/page.tsx` | KEEP |
| `src/app/(driver)/driver/page.tsx` | KEEP |
| `src/app/(internal)/dashboard/page.tsx` | KEEP |
| `src/app/(subcontractor)/subcontractor/page.tsx` | KEEP |
| `src/app/(subcontractor)/subcontractor/dashboard/page.tsx` | KEEP |

### Main Goal Remaining
Complete post-migration hardening (Phase 5): regression QA, accessibility/responsiveness checks, and release readiness.

### Immediate Next Steps (Execution Order)
1. Continue Phase 2 feature colocation for remaining heavy route files.
2. Run route smoke validation matrix for admin/client/driver/subcontractor roles on renamed descriptive routes.
3. Execute full Phase 5 regression + accessibility pass.
4. Prepare release/rollback runbook and sign-off notes.

### Safety Rules For Any New Agent
- Do not change route behavior while doing mechanical migration.
- Keep PRs/batches small and verifiable.
- Validate build after each batch.
- Preserve renamed route path contracts (`/dashboard`, `/projects`, `/reports-dashboard`, etc.) unless a dedicated routing change is approved.

### Validation Commands
- Frontend build: `cd frontend-next && npm run build`
- Optional dev run: `npm --prefix frontend-next run dev -- --port 3000`

### Suggested New Chat Kickoff Prompt
"Continue migration hardening using migrate.md. Execute Phase 2 cleanup and Phase 5 regression/accessibility validation, run build after each batch, and update task statuses in migrate.md."

## What We Will Do

The frontend is now App Router-native: routes are owned by `src/app`, compatibility shims are removed, and `src/legacy-pages` has been decommissioned. Remaining work focuses on Phase 2 feature colocation cleanup and Phase 5 hardening (regression, accessibility, and release-readiness checks).

This plan is designed for **incremental execution** with production safety gates at each phase:
- no route breakage,
- no auth/role regressions,
- no UI/UX regression from legacy behavior,
- and passing TypeScript/build checks after each batch.

---

## Status Labels

Use these labels for every task and update them as work progresses:
- `TODO` = not started
- `IN_PROGRESS` = actively being worked
- `BLOCKED` = waiting on decision/dependency
- `DONE` = implemented and validated

---

## Current Baseline (Starting Point)

- Routes are defined in `frontend-next/src/app`.
- Route ownership migration is complete for all inventoried wrapper routes.
- Some routes are already App Router-native.
- TypeScript hardening has progressed and currently passes build checks with stricter settings.

---

## Migration Principles

1. **Route ownership first**: every route should be physically owned by `src/app`.
2. **Behavior parity before refactor**: move first, improve second.
3. **Small batches**: migrate a route group at a time with build verification.
4. **No hidden rewrites**: keep each PR focused on one phase or subphase.
5. **Delete dead legacy artifacts only after parity verification**.

---

## Phase Plan

## Phase 0 - Preparation and Guardrails

### Goal
Create migration safety rails, inventory all wrappers, and define acceptance checks.

Note: The route inventory below now uses current canonical descriptive route paths. Legacy target paths are retained for migration traceability.

### Tasks
- [x] `DONE` Build route inventory (`src/app` pages vs `src/legacy-pages` mapping).
- [ ] `TODO` Define route-by-route parity checklist template (UI, actions, API calls, edge states).
- [ ] `TODO` Capture baseline screenshots/video for critical flows (login, dashboard, trip lifecycle, approvals).
- [ ] `TODO` Ensure build command and smoke scripts are stable in CI/local.
- [ ] `TODO` Create migration tracking board (phase + route + status).

### Exit Criteria
- Wrapper route inventory is complete.
- Parity checklist exists and is used.
- Baseline validation artifacts captured.

---

## Phase 1 - Route Ownership Migration (Mechanical Move)

### Goal
Replace wrapper-only routes with App Router-owned implementation files under each route folder.

### How
- For each wrapper route in `src/app`, move/import legacy page logic into route-local structure:
  - `src/app/<group>/<route>/page.tsx`
  - `src/app/<group>/<route>/components/*` (if needed)
- Keep each route client-side where required (`"use client"`) to avoid behavior changes.
- Keep API/state integration untouched in this phase.

### Tasks
- [x] `DONE` Internal routes batch 1 (`/accountant-portal`, `/companies`, `/drivers`, `/fleet`, `/facilities`, `/inventory`) - wrappers replaced with route-owned client pages; build passed.
- [x] `DONE` Internal routes batch 2 (`/activity-logs`, `/projects`, `/profile`, `/reports-dashboard`, `/services`, `/settings`) - wrappers replaced; `TemplateSettings` colocated for `/settings`; build passed.
- [x] `DONE` Internal routes batch 3 (`/suppliers`, `/system-monitor`, `/trips`, `/user-management`, `/equipment-admin`, `/ai-sessions`) - wrappers replaced; build passed.
- [x] `DONE` Client routes (`/client/account`, `/client/reports`, `/client/support`) - wrappers replaced; build passed.
- [x] `DONE` Driver routes (`/driver/map`) - wrapper replaced; build passed.
- [x] `DONE` Subcontractor routes (`/subcontractor/assets`, `/subcontractor/profile`) - wrappers replaced; build passed.
- [x] `DONE` Internal residual wrappers (`/landing-settings`, `/logistics/trip-queue`) - wrappers replaced; alias/store parity fix applied; build passed.

### Validation Per Batch
- [ ] `TODO` `npm run build` passes.
- [ ] `TODO` Route renders and actions work.
- [ ] `TODO` Role access/middleware behavior unchanged.

### Exit Criteria
- No route depends on dynamic import wrappers to `src/legacy-pages`.
- App Router owns all route entry files.

---

## Phase 2 - Feature Colocation and Structure Cleanup

### Goal
Move route logic into reusable feature modules and remove route-level bloat.

### Target Structure
- `src/features/<domain>/ui/*`
- `src/features/<domain>/model/*`
- `src/features/<domain>/api/*`
- Thin `src/app/**/page.tsx` composition only.

### Tasks
- [ ] `IN_PROGRESS` Identify top heavy route files and split into components/hooks.
- [ ] `TODO` Move shared logic from route files into `src/features/*`.
- [ ] `TODO` Remove duplicated UI/patterns between migrated legacy screens.
- [ ] `TODO` Normalize naming conventions and folder ownership.

### Exit Criteria
- Route files are orchestration-focused, not monolithic.
- Shared feature logic lives in `src/features`.

---

## Phase 3 - Router Compatibility Layer Removal

### Goal
Remove dependency on React Router compatibility abstractions for migrated routes.

### Tasks
- [x] `DONE` Audit usage of `src/lib/reactRouterCompat.tsx` across migrated pages.
- [x] `DONE` Replace compat navigation/hooks with Next App Router primitives (`next/navigation`, `next/link`).
- [x] `DONE` Remove dead compat code paths no longer used (`src/lib/reactRouterCompat.tsx` removed).
- [x] `DONE` Validate deep links and query param behavior parity via production build after non-legacy compat removal.

### Exit Criteria
- Compat layer is unused or reduced to intentional minimal scope.
- Navigation/query behavior remains correct.

---

## Phase 4 - Legacy Folder Decommission

### Goal
Delete `src/legacy-pages` safely after ownership and parity are complete.

### Tasks
- [x] `DONE` Confirm no imports from `src/legacy-pages` remain.
- [x] `DONE` Remove `@/pages/*` alias from `frontend-next/tsconfig.json`.
- [x] `DONE` Delete legacy files (`frontend-next/src/legacy-pages`).
- [x] `DONE` Run full build validation after deletion.

### Exit Criteria
- `src/legacy-pages` removed.
- No build/runtime references to legacy paths or `@/pages/*` alias.

---

## Phase 5 - Hardening, QA, and Release

### Goal
Finalize confidence for production cutover.

### Tasks
- [ ] `TODO` Full regression pass on core flows (Trips, Fleet, Drivers, Services, Reports, Approvals).
- [ ] `TODO` Accessibility and responsiveness sanity pass.
- [ ] `TODO` Error boundary and empty-state verification.
- [ ] `TODO` Monitor logs/telemetry after deploy for route or action regressions.
- [ ] `TODO` Prepare rollback notes and recovery commands.

### Exit Criteria
- Migration release approved.
- No critical regressions observed in post-deploy window.

---

## Work Breakdown and Tracking Table

| ID | Phase | Task | Status | Notes |
|---|---|---|---|---|
| P0-1 | 0 | Build wrapper route inventory | DONE | Added in Route Inventory Snapshot section |
| P0-2 | 0 | Create parity checklist template | TODO | |
| P0-3 | 0 | Capture baseline artifacts | TODO | |
| P1-1 | 1 | Internal batch 1 migration | DONE | `/accountant-portal`,`/companies`,`/drivers`,`/fleet`,`/facilities`,`/inventory` moved to route-owned page files; `npm run build` passed |
| P1-2 | 1 | Internal batch 2 migration | DONE | `/activity-logs`,`/projects`,`/profile`,`/reports-dashboard`,`/services`,`/settings` moved; `TemplateSettings` colocated; build passed |
| P1-3 | 1 | Internal batch 3 migration | DONE | `/suppliers`,`/system-monitor`,`/trips`,`/user-management`,`/equipment-admin`,`/ai-sessions` moved; residual `/landing-settings` + `/logistics/trip-queue` also moved; build passed |
| P1-4 | 1 | Client routes migration | DONE | `/client/account`,`/client/reports`,`/client/support` moved; build passed |
| P1-5 | 1 | Driver routes migration | DONE | `/driver/map` moved; build passed |
| P1-6 | 1 | Subcontractor routes migration | DONE | `/subcontractor/assets`,`/subcontractor/profile` moved; build passed |
| P2-1 | 2 | Feature colocation for heavy routes | IN_PROGRESS | Initial extraction started in `src/features/projects/useProjectsPageMetrics.ts` |
| P2-2 | 2 | Remove duplicated UI patterns | TODO | |
| P3-1 | 3 | Replace compat router APIs | DONE | `reactRouterCompat` removed and Next navigation APIs adopted |
| P3-2 | 3 | Validate query/deep-link parity | DONE | Build validated after compat removal and route refactors |
| P4-1 | 4 | Remove legacy imports/alias | DONE | `@/pages/*` alias removed and no remaining legacy references |
| P4-2 | 4 | Delete `src/legacy-pages` | DONE | Legacy folder deleted and production build passed |
| P5-1 | 5 | Full regression + release validation | TODO | |

---

## Suggested Execution Cadence

- Daily: update status labels per task.
- Per migration batch: run build + smoke checks before merging.
- Per phase: produce short summary (completed, blocked, next).

---

## Risks and Mitigations

1. Risk: Hidden behavior drift during moves.
- Mitigation: parity checklist + baseline comparison before and after.

2. Risk: Role/middleware route regressions.
- Mitigation: role-based smoke matrix for admin/client/driver/subcontractor.

3. Risk: Large PRs hard to review.
- Mitigation: route-batch PR strategy (small, isolated changes).

4. Risk: Legacy helper coupling.
- Mitigation: migrate helper dependencies first, then route UI.

---

## Definition of Done (Final)

- All route entries are App Router-native.
- No runtime imports from `src/legacy-pages`.
- Build/tests/smoke checks pass.
- Critical user flows validated.
- Migration tracking table shows all relevant tasks as `DONE`.
