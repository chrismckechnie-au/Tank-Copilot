# Phase 1 Auth, Tanks & Water Tests Update

## Phase 1 — Auth, Tanks, Water Tests, Dashboard

- [x] Magic-link and Google auth routes scaffolded with Supabase SSR callback flow.
- [x] Protected app shell and middleware added, with a safe missing-config state.
- [x] Tank schema migration added for hobby-owned tanks.
- [x] Equipment baseline schema added, with tank + baseline creation handled transactionally by RPC.
- [x] Water-test schema migration added with critical numeric constraints and DB-side completeness validation.
- [x] First tank onboarding form added.
- [x] Water-test logging form added with tank-type critical-field validation and optional validated photo upload.
- [x] Dashboard and tank detail pages added; dashboard cards show the latest saved water-test state.
- [x] Validation unit tests added for onboarding, water-test parsing, and photo upload rules.
- [x] Analytics replay risk mitigated with session recording disabled and DOM/input masking configured.
- [ ] Supabase anon key provided and live auth flow verified.
- [ ] Remote Supabase migrations applied and RLS tested against the cloud project.
- [ ] GStack browser smoke covers onboard -> test -> dashboard.

## Evidence

- Playwright covers the shell, `/health`, manifest, login page, and missing-config protected route state.
- `npm run check` passed: typecheck, lint, and 15 Vitest tests.
- `npm run build` passed after rerunning separately from E2E to avoid `.next` write races.
- `npm run test:e2e` passed: 10 Playwright tests across desktop and mobile Chrome.
- Security, data-integrity, and correctness review findings were applied: PostHog replay masking, DB-side water-test invariant trigger, atomic hobby tank creation RPC, partial equipment validation, private photo upload validation/storage, dashboard latest-test state, and hobby/client RLS tightening.
- Rules v0 remains unsigned; Phase 1 stores test data only and does not surface actionable advice.

## Inputs Needed

- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Rotated Supabase service-role key and DB password before real data.

## Residual Risks

- Local Supabase RLS tests could not run because Docker is unavailable in this environment.
- Live auth and remote migration verification remain blocked until the browser anon key is provided and the cloud migration is applied.
- GStack CLI browser smoke is still blocked by the local `browse` server path issue; Playwright is covering browser smoke in the interim.
