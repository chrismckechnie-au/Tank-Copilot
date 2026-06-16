# Phase 3 Report And Share Update

## Phase 3 — Deterministic Report + Public Share Slice

- [x] Deterministic report builder added with `FullReportV1` and sanitized `PublicReportV1`.
- [x] Public report golden redaction tests cover raw IDs, tank names, free-text notes, photo paths, and unsigned checklist suppression.
- [x] `reports` schema, owner RLS, and exact-token `get_public_report` RPC added.
- [x] Anonymous direct table scans remain denied; public access goes through the sanitized RPC projection only.
- [x] `/tanks/[id]/reports` owner page added for report generation, share enable, and share revoke.
- [x] `/r/[shareId]` public noindex HTML route added with exact-token lookup and 410 for revoked/expired links.
- [x] AI remains disabled; report prose uses deterministic fallback content only.
- [ ] Cloud Supabase migration execution and RLS smoke tests are still pending.
- [ ] Full authenticated browser flow is still blocked until `NEXT_PUBLIC_SUPABASE_ANON_KEY` is configured.
- [ ] PDF generation remains unimplemented.

## Evidence

- Red test confirmed before implementation: `npm run test -- src/lib/reports/builder.test.ts` failed because `src/lib/reports/builder.ts` did not exist.
- Green targeted test after implementation: `npm run test -- src/lib/reports/builder.test.ts src/app/r/[shareId]/route.test.ts` passed 5 tests.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test` passed: 9 files, 45 tests.
- `npm run build` passed and includes `/r/[shareId]` and `/tanks/[id]/reports`.
- `npm run test:e2e` passed: 10 Playwright tests.
- `npm audit --omit=dev` passed with 0 vulnerabilities.
- Focused security review found no blocking issues for anonymous table-scan denial, exact-token RPC access, revoked/expired 410 behavior, public redaction, server-only report insert, or owner-only share updates.
- `npx supabase db lint --local` could not run because local Postgres at `127.0.0.1:54322` is unavailable.

## Residual Risks

- Local Supabase RLS execution remains unverified because local Supabase/Postgres is unavailable.
- Public route/RPC behavior is verified by code review and unit redaction tests, not by a live anonymous Supabase request yet.
- Share links are enabled by explicit owner action and default to 30-day expiry; default policy can be revisited after product review.
- Rules v0 remains unsigned, so public reports intentionally suppress action checklists and signed-rule explanations.
