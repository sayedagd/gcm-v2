# GCM v2 Session Summary (June 1, 2026)

This file is a startup memory for the next AI chat to continue work without losing context.

## 1) High-level outcomes

- Repository was reduced to three top-level directories plus git metadata:
  - `backend/`
  - `frontend/`
  - `handover-site/`
- Architecture was finalized as split deployment:
  - Frontend and backend are separate Vercel projects.
  - Handover site is local-only static documentation.
  - No Docker local workflow.
- Legacy root clutter and duplicated documentation were cleaned and migrated.

## 2) Frontend status

- Frontend lives under `frontend/` as a React + Vite + TypeScript SPA.
- Vercel SPA rewrite is configured in `frontend/vercel.json`.
- Frontend environment template was aligned for split API architecture via `frontend/.env.example`.
- Frontend build checks were passing during the cleanup session.

## 3) Backend status

### Runtime architecture

- Backend remains Express API-only and no longer serves SPA shell.
- Key runtime files at backend root are intentionally minimal:
  - `backend/app.js`
  - `backend/database.js`
  - `backend/fileService.js`
  - `backend/jest.config.js`
- Vercel serverless entry path is present:
  - `backend/api/[...path].js`
- Backend rewrites are configured in:
  - `backend/vercel.json`

### Environment and CORS

- Runtime env loading was narrowed to backend-local env patterns.
- Backend split-deploy CORS behavior was added/updated around:
  - `CORS_ORIGIN`
  - optional `CORS_ALLOW_VERCEL_PREVIEWS`
- Backend env template was updated in `backend/.env.example`.

### Database behavior

- Docker-specific DB branching was removed from backend DB initialization.
- `DATABASE_URL`-first production flow with local fallback is in place in `backend/database.js`.

## 4) Documentation migration and handover site

- Markdown content was migrated into static HTML handover pages under `handover-site/`.
- New/updated docs include deployment and architecture guidance for split Vercel hosting.
- Cross-linking across pages was added (index, deployment, docs, architecture, print).
- `handover-site/backend.html` now includes maintenance script structure notes:
  - active tools in `backend/scripts/maintenance/`
  - legacy scripts archived in `backend/scripts/maintenance/archive/`

## 5) Backend scripts reorganization (latest work)

### What was done first

- Ad-hoc root backend scripts were moved into structured folders:
  - `backend/scripts/maintenance/`
  - `backend/scripts/debug/` (temporary during transition)
- All broken relative imports from moved files were fixed.
- Syntax and diff checks were run and passed.

### Conservative cleanup pass

- Clearly ad-hoc debug probe files were removed:
  - former `backend/scripts/debug/test.js`
  - former `backend/scripts/debug/test_db.js`
  - former `backend/scripts/debug/testDataFlow.js`
  - former `backend/scripts/debug/testLogicFlow.js`
- Related debug npm aliases were removed from `backend/package.json`.

### Second conservative pass (active vs archive)

- Two one-off legacy migration scripts were archived, not deleted:
  - `backend/scripts/maintenance/archive/fix-trips-columns.js`
  - `backend/scripts/maintenance/archive/manual-migration.js`
- Their npm aliases were removed from `backend/package.json`.
- Active maintenance aliases currently kept in `backend/package.json`:
  - `maintenance:create-test-accounts`
  - `maintenance:inject-services`
  - `maintenance:reset-admin`
  - `maintenance:reset-testing`
  - `maintenance:wipe-data`
- Maintenance folder guide was added:
  - `backend/scripts/maintenance/README.md`

## 6) Validation performed during session

- Repeated syntax checks passed:
  - `find scripts -name '*.js' -print0 | xargs -0 -n1 node --check`
- `backend/package.json` JSON parse validation passed.
- Diff hygiene checks passed:
  - `git diff --check`
- Frontend build checks passed earlier in session.
- Handover-site references were scanned after script cleanup; no stale debug references remained.

## 7) Current working tree snapshot (conceptual)

- Modified:
  - `backend/package.json`
  - `handover-site/backend.html`
- Added (new tracked paths expected):
  - `backend/scripts/maintenance/README.md`
  - `backend/scripts/maintenance/archive/*`
  - `session.md` (this file)
- Backend `scripts/maintenance/` now contains active operational tools plus `archive/` for one-off legacy scripts.

## 8) Recommended next steps for next chat

1. Optionally normalize maintenance script filenames to consistent kebab-case naming (if desired).
2. Add a small operations runbook section in `handover-site/runbooks.html` mapping each maintenance command to safe use cases and warnings.
3. Decide whether any archived script can be permanently removed after schema/version confirmation.
4. Commit in logical chunks:
   - backend script architecture cleanup
   - handover backend page update
   - session startup memory file

## 9) Important constraints and decisions to preserve

- Keep the three-folder root shape (`backend/`, `frontend/`, `handover-site/`).
- Preserve split frontend/backend Vercel deployment model.
- Keep handover-site local-only docs.
- Avoid reintroducing Docker-local assumptions.
- Prefer conservative archive over hard delete for ambiguous maintenance scripts.

## 10) Next Chat Bootstrap Prompt (copy/paste)

Use this prompt at the start of the next chat:

"Continue from session memory in session.md at workspace root. First, read and verify current status of:

- backend/package.json
- backend/scripts/maintenance/
- backend/scripts/maintenance/archive/
- handover-site/backend.html

Then do the following in order:

1. Confirm repo still follows three top-level directories: backend, frontend, handover-site.
2. Verify backend maintenance commands still run from package.json without debug aliases.
3. Add a short operations section to handover-site/runbooks.html describing when to use each active maintenance command and safety warnings.
4. Propose a safe decision matrix for archived scripts (keep/archive-delete) based on schema relevance.
5. Run syntax and diff-hygiene checks and summarize final status.

Constraints:

- Keep split frontend/backend Vercel architecture.
- Keep handover-site local-only.
- Do not reintroduce Docker-local assumptions.
- Prefer conservative archive over deletion unless clearly safe.
"

Optional shorter version:

"Resume from session.md, validate current backend maintenance architecture, update handover runbook with maintenance command usage and warnings, then return a safe archive/delete recommendation for legacy scripts with verification checks."
