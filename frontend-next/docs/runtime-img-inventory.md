# Runtime <img> Inventory (Interactive UI)

Generated: 2026-06-06
Scope searched: `src/app/**` and `src/components/**`
Raw matches: 58

## Runtime Interactive UI Files

- `src/app/(client)/client/account/page.tsx` (lines: 199, 553, 586)
- `src/app/(client)/client/support/page.tsx` (line: 527)
- `src/app/(internal)/activity-logs/page.tsx` (line: 219)
- `src/app/(internal)/companies/page.tsx` (line: 279)
- `src/app/(internal)/equipment-admin/page.tsx` (lines: 182, 245)
- `src/app/(internal)/landing-settings/page.tsx` (lines: 57, 249, 370, 442)
- `src/app/(internal)/logistics/trip-queue/page.tsx` (line: 236)
- `src/app/(internal)/profile/page.tsx` (line: 54)
- `src/app/(internal)/projects/page.tsx` (line: 321)
- `src/app/(internal)/settings/page.tsx` (lines: 171, 529)
- `src/components/companies/CompanyCard.tsx` (lines: 34, 36)
- `src/components/companies/CompanyWizard.tsx` (line: 56)
- `src/components/companies/CompanyDetails.tsx` (line: 196 runtime view)
- `src/components/dashboard/ActivityFeed.tsx` (line: 91)
- `src/components/finance/CompanyFinancials.tsx` (line: 266)
- `src/components/fleet/VehicleDetails.tsx` (lines: 205, 214, 515)
- `src/components/fleet/VehicleWizard.tsx` (lines: 333, 360)
- `src/components/layout/LoginModal.tsx` (lines: 26, 29)
- `src/components/layout/MainLayout.tsx` (lines: 184, 187, 262, 264)
- `src/components/layout/PublicFooter.tsx` (lines: 30, 33)
- `src/components/layout/PublicNavbar.tsx` (lines: 55, 58)
- `src/components/projects/ProjectCard.tsx` (lines: 41, 43)
- `src/components/projects/ProjectDetails.tsx` (line: 254 runtime view)
- `src/components/trips/DriverTripWizard.tsx` (line: 428)
- `src/components/trips/TripDetailsModal.tsx` (line: 569)
- `src/components/trips/TripWizard.tsx` (line: 1287)
- `src/components/ui/FileUploader.tsx` (line: 78)
- `src/components/ui/SignatureApproveModal.tsx` (lines: 329, 358)
- `src/components/users/UserCard.tsx` (line: 77)
- `src/components/users/UserDetails.tsx` (line: 64)
- `src/components/users/UserWizard.tsx` (line: 174)
- `src/app/(internal)/settings/TemplateSettings.tsx` (lines: 413, 452 runtime preview/editor)

## Non-Interactive or Export/Print Template Context (Inventory Only)

These are `<img>` occurrences inside generated HTML strings or print/export template builders and should be excluded from automatic `next/image` migration:

- `src/components/companies/CompanyDetails.tsx` (line: 118)
- `src/components/projects/ProjectDetails.tsx` (lines: 173, 180, 233)
- `src/app/(internal)/settings/TemplateSettings.tsx` (lines: 173, 185)

## Notes For Next Task

- High-frequency shells: `MainLayout`, `PublicNavbar`, `PublicFooter`, and table/card avatars should be prioritized first.
- Dynamic document/proof previews in trips/fleet/settings should be migrated carefully with explicit dimensions to avoid CLS.
- Export/print-template string-rendered HTML must remain on raw `<img>`.
