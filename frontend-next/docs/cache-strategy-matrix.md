# Cache Strategy Matrix

## Purpose
Define a consistent cache policy for Next App Router routes and server-side API reads.

## Route Categories

| Category | Examples | Route Segment Policy | Server Fetch Strategy | Rationale |
|---|---|---|---|---|
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

- Internal route group already enforces dynamic rendering via `src/app/(internal)/layout.tsx`.
- Internal dashboard server read now uses `fetchApiJson(..., { strategy: "dynamic" })` and forwards auth cookies.
- Public landing/store routes remain static-friendly.

## Review Rule

When introducing a new route:

1. Classify the route using the matrix above.
2. Set segment-level caching directives first.
3. Ensure server reads use the matching `fetchApiJson` strategy.
4. Verify with `check:type-strict` and `build` before marking complete.
