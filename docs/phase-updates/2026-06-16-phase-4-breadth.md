# Phase 4 Breadth Update

## Phase 4 — Trends, Export, Livestock, And Stocking Planner Slice

- [x] Water-test trend summarizer added with latest/previous deltas and stability-focused warning copy.
- [x] `/tanks/[id]/trends` page added with JSON and CSV export links.
- [x] Owner-only `/tanks/[id]/export` route added for full tank-history JSON/CSV export.
- [x] Export sanitization strips share tokens and private artifact paths, including nested report content.
- [x] CSV export protects against spreadsheet formula injection, including leading whitespace/control-character bypasses.
- [x] `livestock` schema added with tank-owned RLS, bounded quantity/status/notes, and updated typed Supabase contracts.
- [x] `/tanks/[id]/livestock` page added for livestock list, create flow, and status updates.
- [x] Stocking planner v0 added as warning-only guidance with confidence and safer alternatives.
- [x] Planner copy avoids definitive compatibility decisions and does not provide dosing/corrective actions.
- [ ] Cloud Supabase migration execution and RLS smoke tests are still pending.
- [ ] Full authenticated browser flow is still blocked until `NEXT_PUBLIC_SUPABASE_ANON_KEY` is configured.
- [ ] Stocking planner remains source-light and must not be marketed as species compatibility until a sourced species dataset exists.

## Evidence

- Targeted tests passed: `npm run test -- src/lib/trends/water-tests.test.ts src/lib/stocking/planner.test.ts src/lib/export/tank-history.test.ts src/lib/livestock/validation.test.ts` passed 11 tests.
- `npm run check` passed: typecheck, lint, 15 Vitest files, 74 tests.
- `npm run build` passed and includes `/tanks/[id]/trends`, `/tanks/[id]/export`, and `/tanks/[id]/livestock`.
- `npm run test:e2e` passed: 10 Playwright tests.
- `npm audit --omit=dev` passed with 0 vulnerabilities.
- Secret scan found no committed Supabase, Anthropic, database, or Resend secret values.
- Security review passed with no blocking findings after recursive report export sanitization.
- `npx supabase db lint --local` could not run because local Postgres at `127.0.0.1:54322` is unavailable.

## Residual Risks

- Local Supabase RLS execution remains unverified because local Supabase/Postgres is unavailable.
- Export route behavior is code/type/test verified but not exercised in a live authenticated browser session.
- Stocking planner confidence remains low/medium because no signed species compatibility dataset exists yet.
