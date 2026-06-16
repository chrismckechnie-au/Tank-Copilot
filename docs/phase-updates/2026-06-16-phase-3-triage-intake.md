# Phase 3 Triage Intake Update

## Phase 3 — Symptom Triage Slice

- [x] Structured observation validation added for symptoms, affected livestock, and recent changes.
- [x] Safe follow-up prompts added without diagnosis, dosing, or treatment language.
- [x] Observations schema, owner-scoped RLS, and `create_observation` RPC boundary added.
- [x] Protected `/tanks/[id]/triage` intake route added.
- [x] Optional private photo upload added for observations with server-side decode/re-encode metadata stripping.
- [x] Tank detail route links to observation intake.
- [ ] Report builder, public share route, revocation/expiry, and `PublicReportV1` remain unimplemented.
- [ ] AI layer remains disabled/unimplemented for reports.

## Evidence

- Red test confirmed before implementation: `npm run test -- src/lib/triage/validation.test.ts` failed because `src/lib/triage/validation.ts` did not exist.
- Green targeted test after implementation: `npm run test -- src/lib/triage/validation.test.ts` passed 4 tests.
- Security review found forged generated observation fields and unsanitized photo bytes; fixes applied before commit.
- Green targeted regression after fixes: `npm run test -- src/lib/images/sanitize.test.ts src/lib/triage/validation.test.ts` passed 7 tests.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test` passed: 7 files, 40 tests.
- `npm run build` passed and includes route `/tanks/[id]/triage`.
- `npm run test:e2e` passed: 10 Playwright tests.
- `npm audit --omit=dev` passed with 0 vulnerabilities after adding a PostCSS override for Next's pinned vulnerable transitive version.
- `npx supabase db lint --local` could not run because local Postgres at `127.0.0.1:54322` is unavailable.

## Residual Risks

- Local Supabase RLS execution remains unverified because local Supabase/Postgres is unavailable.
- Cloud Supabase migration execution is still pending.
- Triage is context collection only; no diagnosis, report, or public share surface ships in this slice.
- Report/share, AI fallback parity, revocation/expiry, and `PublicReportV1` golden redaction tests remain Phase 3 follow-up work.
