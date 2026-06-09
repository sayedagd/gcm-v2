# Cache Strategy Matrix

## Purpose

Define a consistent cache policy for Next App Router routes and server-side API reads.

## Route Categories

| Category | Examples | Route Segment Policy | Server Fetch Strategy | Rationale |
| --- | --- | --- | --- | --- |
| Public marketing pages | `/`, `/landing`, `/store`, `/home` | Static by default (`dynamic` unset) | `static` or `revalidate` | High cache hit ratio and SEO stability. |
| Auth entry pages | `/login`, `/logout`, `/unauthorized` | Dynamic when user context matters | `dynamic` | Session/cookie-sensitive behavior. |
| Internal operational dashboards | `/dashboard`, `/trips`, `/companies`, `/projects`, `/fleet`, `/inventory` | `dynamic = "force-dynamic"`, `fetchCache = "force-no-store"` for read-heavy mutable flows | `dynamic` | Prevent stale operational data and cross-user leakage. |
| Role dashboards (client/driver/subcontractor) | `/client/dashboard`, `/driver`, `/subcontractor/dashboard` | Dynamic | `dynamic` | User-scoped data with frequent updates. |
| Analytics/report views | `/reports-dashboard` | Dynamic route, selective `revalidate` for expensive aggregates if safe | `dynamic` for privileged snapshots; `revalidate` for non-sensitive aggregate widgets | Balance freshness and backend load. |
| Route handlers for writes | `/api/write/*` | Always uncached | N/A | Mutations must never be cache served. |

## Server Fetch Utility Mapping

Use `fetchApiJson` from `src/lib/serverFetch.ts` with these rules:

- `strategy: "dynamic"` for authenticated or tenant-specific reads.
- `strategy: "static"` only for truly public, non-personalized content.
- `strategy: "revalidate"` with explicit `revalidateSeconds` for controlled stale-while-revalidate use.

## Current Baseline Alignment

- Internal route group enforces dynamic rendering and no-store caching via `src/app/(internal)/layout.tsx`.
- Internal dashboard server read now uses `fetchApiJson(..., { strategy: "dynamic" })` and forwards auth cookies.
- Public landing/store routes remain static-friendly.

## Domain Invalidation Strategy

Use explicit Redis key namespaces so invalidation is deterministic and scoped:

- `project:list:{tenantId}` for filtered project listings.
- `project:detail:{projectId}` for single project pages and API reads.
- `trip:list:{tenantId}:{status}` for dashboard/filter trip tables.
- `trip:detail:{tripId}` for trip details.
- `dashboard:aggregate:{tenantId}:{window}` for expensive rollups.

### Trigger-to-Invalidation Matrix

| Domain event | Invalidate keys | Notes |
| --- | --- | --- |
| `project:created` | `project:list:{tenantId}`, `dashboard:aggregate:{tenantId}:*` | New projects change both listings and aggregate counters. |
| `project:updated` | `project:list:{tenantId}`, `project:detail:{projectId}`, `dashboard:aggregate:{tenantId}:*` | Update detail and any aggregate that references project state. |
| `project:deleted` | `project:list:{tenantId}`, `project:detail:{projectId}`, `dashboard:aggregate:{tenantId}:*` | Delete stale detail cache and list snapshots. |
| `trip:created` | `trip:list:{tenantId}:*`, `dashboard:aggregate:{tenantId}:*` | Trip lifecycle affects operational tables and dashboard KPI cards. |
| `trip:updated` | `trip:list:{tenantId}:*`, `trip:detail:{tripId}`, `dashboard:aggregate:{tenantId}:*` | Status transitions must be visible immediately. |
| `trip:deleted` | `trip:list:{tenantId}:*`, `trip:detail:{tripId}`, `dashboard:aggregate:{tenantId}:*` | Remove stale trip rows and derived summaries. |

### Execution Rules

1. Keep invalidation write-through and event-driven: perform mutation, emit event, then invalidate matching keys.
2. Never wildcard flush globally. Use namespace prefixes by tenant and entity only.
3. Prefer short TTL plus deterministic invalidation for high-churn domains.
4. For dashboard aggregates, invalidate on project/trip writes and regenerate lazily on next read.
5. Record invalidation failures to logs and metrics, but do not block write success path.

### Ownership and Verification

- Backend ownership: event emission and Redis invalidation handlers in API/worker services.
- Frontend ownership: route segment strategy and `fetchApiJson` strategy alignment.
- Verification checks:
  - entity mutation test confirms key removal for affected domain.
  - dashboard read after mutation returns refreshed aggregate values.
  - multi-tenant test confirms invalidation does not leak across tenants.

## Review Rule

When introducing a new route:

1. Classify the route using the matrix above.
2. Set segment-level caching directives first.
3. Ensure server reads use the matching `fetchApiJson` strategy.
4. Verify with `check:type-strict` and `build` before marking complete.

## Automated Policy Guard

- Run `npm run check:cache-strategy` to enforce route cache policy invariants.
- The guard currently enforces:
  - `src/app/(internal)/layout.tsx` exports `dynamic = "force-dynamic"`.
  - `src/app/(internal)/layout.tsx` exports `fetchCache = "force-no-store"`.
  - public routes (`/`, `/home`, `/landing`, `/store`) do not force dynamic mode.
