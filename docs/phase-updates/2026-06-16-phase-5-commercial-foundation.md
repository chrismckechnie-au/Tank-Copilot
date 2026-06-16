# Phase 5 Commercial Foundation

Status: partial foundation shipped.

## Completed

- [x] Added `businesses`, `team_members`, and `clients` schema foundation.
- [x] Added business RLS helper primitives with fixed `search_path`.
- [x] Added role-gated business/client/tank policies for admin/editor/viewer access.
- [x] Added membership invariant triggers for admin-only mutation and last-admin protection.
- [x] Added feature-gated business workspace UI and server actions.
- [x] Added client-tank creation RPC and business report generation path.
- [x] Added private branded HTML report artifact without Tank Copilot watermark.
- [x] Blocked public share toggles for service/business reports.
- [x] Added static migration tests, validation tests, and branded report tests.

## Verification

- [x] `npm run check`
- [x] `npm run build`
- [x] `npm run test:e2e`
- [x] `npm audit --omit=dev`
- [x] Secret scan for committed credentials returned no matches.
- [ ] `npx supabase db lint --local` blocked: local Supabase Postgres is not running on `127.0.0.1:54322`.

## Remaining Gaps

- [ ] Apply and validate the migration against a real Supabase database.
- [ ] Add live RLS integration tests for cross-business isolation and revocation mid-session.
- [ ] Add PDF rendering/storage for branded reports; current artifact is PDF-ready private HTML.
- [ ] Add storage policies for business-owned logo/report assets.
- [ ] Replace pilot team-member UUID entry with an invite/email workflow.
