# Tank Copilot

Tank Copilot is a mobile-first PWA for aquarium water-test logging, safety-first triage, and shareable reports.

The product rule is strict: deterministic rules make safety decisions; AI may only rewrite, summarize, and ask follow-up questions after rules have produced the result.

## Stack

- Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui
- Supabase Auth, Postgres, RLS, Storage, and migrations
- Vitest and Playwright
- PostHog for product analytics
- Stripe and Anthropic in later phases

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

`SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DATABASE_URL` are server-only. Never prefix them with `NEXT_PUBLIC_`, never commit them, and rotate any credential that has been shared outside a secret manager.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

## Supabase

Local CLI commands are available through npm:

```bash
npm run supabase:start
npm run supabase:db:reset
npm run supabase:stop
```

The first migration creates `public.profiles` with RLS and an auth-user trigger.

## Project Docs

- `PLAN.md` is the canonical build plan.
- `CONTEXT.md` contains domain language and safety boundaries.
- `docs/rules/rules-v0-spec.md` tracks unsigned rule thresholds and reviewer status.
- `docs/research/source-registry.md` tracks source URLs and access dates for safety-critical claims.
- `docs/phase-updates/` records checkbox-based progress updates.
