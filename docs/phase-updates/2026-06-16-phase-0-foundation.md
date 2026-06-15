# Phase 0 Foundation Update

## Phase 0A — Discovery, Prototype & Safety Specification

- [ ] 15-25 discovery interviews completed or explicitly waived.
- [ ] Clickable prototype and sample tank reports reviewed.
- [ ] `docs/rules/rules-v0-spec.md` drafted with thresholds, canonical units, tank applicability, sources, and reviewer status.
- [x] Source registry created with source tracking structure.
- [ ] At least two rules reviewers identified.

## Phase 0B — Foundation & Setup

- [x] Git repository initialized on `feat/phase-0-foundation`.
- [x] GitHub remote configured.
- [x] Next.js 15, TypeScript, Tailwind, shadcn/ui scaffold created.
- [x] Supabase local project files and first profiles/RLS migration created.
- [x] Secret-safe `.env.example` created.
- [x] PWA manifest, icon, service worker, and registration added.
- [x] Vitest and Playwright baseline configs added.
- [ ] Supabase anon key provided and browser auth env verified.
- [ ] Vercel project linked and preview deployed.
- [ ] PostHog receives a pageview.
- [x] Baseline typecheck/lint/unit/build/e2e verification passes.
- [x] Compound/Superpowers review pass recorded before phase close.

## Current Blockers / Inputs Needed

- [ ] Supabase anon key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Vercel project link/permission for preview deployment.
- [ ] PostHog key if not already available outside this chat.
- [ ] Two domain reviewers for Rules v0 sign-off.

## Notes

- The service-role key and database password were shared in chat. Rotate both in Supabase before real users or real data.
- Rules v0 is unsigned; no actionable advice/report surfaces may ship yet.
- Playwright browser smoke runs on port `3107` to avoid reusing unrelated apps on port `3000`.
- Local Supabase CLI is installed, but Docker is not available on this machine, so local database reset/lint cannot run yet.
- GStack browser binary is present but failed to locate its bundled server script in this install; Playwright browser QA is covering Phase 0 until GStack is repaired.
- Security review findings fixed in this slice: removed self-write profile policies, disabled automatic PostHog pageviews, added analytics redaction tests, narrowed service-worker fallback, and added explicit profile grants.
