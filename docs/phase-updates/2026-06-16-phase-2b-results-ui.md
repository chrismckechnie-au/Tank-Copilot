# Phase 2B Result UI & Recommendations Update

## Phase 2B — Result UI and Recommendations

- [x] Result route added at `/tanks/[id]/results` and consumes real saved tank/test rows.
- [x] Water-test logging now builds and persists an unsigned recommendation draft for the saved test.
- [x] Recommendation persistence schema added with owner-scoped RLS through the tank.
- [x] Result UI shows severity, confidence, source-linked rule explanations, flags, and persistence status.
- [x] Unsigned action checklists, report generation, and share surfaces are hidden/disabled pending domain sign-off.
- [x] Unsigned checklists are not persisted into authenticated-readable rows.
- [x] Save redirects include the exact saved test ID so result pages do not drift to a newer test.
- [x] Result pages render persisted recommendation content when present and only recompute as an explicit fallback.
- [x] Tests added for persisted-row to rules-input mapping and unsigned checklist hiding.
- [ ] Domain reviewer sign-off is still required before actionable advice/report surfaces.
- [ ] Independent rules/safety review still needed before Phase 2B closure.

## Evidence

- Red test confirmed before implementation: `npm run test -- src/lib/rules/recommendations.test.ts` failed because `src/lib/rules/recommendations.ts` did not exist.
- Green targeted test after implementation: `npm run test -- src/lib/rules/recommendations.test.ts` passed 2 tests.
- `npm run check` passed: typecheck, lint, and 33 Vitest tests.
- `npm run build` passed with `/tanks/[id]/results`.
- `npm run test:e2e` passed 10 Playwright tests across desktop and mobile Chrome.
- Adversarial review found checklist exposure, redirect drift, and recomputation auditability issues; fixes were applied.
- Focused re-review returned no findings and cleared the prior Phase 2B issues.

## Residual Risks

- Recommendation writes use the authenticated Supabase client and RLS; local RLS execution remains unverified because local Supabase/Postgres is unavailable.
- `npx supabase db lint --local` remains blocked because no local Postgres is listening on `127.0.0.1:54322`.
- The UI is intentionally info-only until Rules v0 has two domain reviewer sign-offs.
- Generate-report remains disabled; Phase 3 owns report/share boundaries.
