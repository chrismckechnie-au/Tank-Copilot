# Phase 4 Maintenance And Reminder Update

## Phase 4 — Maintenance Tasks + Reminder Queue Slice

- [x] `maintenance_tasks` schema added with tank-owned RLS, bounded cadence, due dates, and reminder opt-in.
- [x] New hobby tanks seed starter cadences for water tests, water-change review, filter/flow inspection, and reef stability checks.
- [x] One-tap complete updates `last_completed_on` and reschedules `next_due_on` from cadence.
- [x] Manual reschedule updates due date and skips stale pending/failed/sending reminder deliveries.
- [x] Reminder delivery queue added with pending/sending/sent/failed/skipped states, three-attempt retry tracking, stale-send recovery, freshness checks, stable idempotency, and bounded error storage.
- [x] Supabase Edge Function `send-maintenance-reminders` added for cron-triggered email delivery through Resend.
- [x] Tank tasks screen added for create/complete/reschedule workflows.
- [x] Dashboard now surfaces due maintenance-task counts per tank.
- [ ] Cloud Supabase migration execution and pg_cron scheduling are still pending.
- [ ] Reminder email delivery is not live until `REMINDER_CRON_SECRET`, `RESEND_API_KEY`, `REMINDER_FROM_EMAIL`, and cron invocation are configured.
- [ ] Full authenticated browser flow is still blocked until `NEXT_PUBLIC_SUPABASE_ANON_KEY` is configured.

## Evidence

- Red validation test confirmed before UI wiring: `npm run test -- src/lib/maintenance/validation.test.ts` failed before the validation module existed.
- Green targeted validation test after implementation: `npm run test -- src/lib/maintenance/validation.test.ts` passed 3 tests.
- `npm run check` passed: typecheck, lint, 11 Vitest files, 63 tests.
- `npm run build` passed and includes `/tanks/[id]/tasks`.
- `npm run test:e2e` passed: 10 Playwright tests.
- `npm audit --omit=dev` passed with 0 vulnerabilities.
- Secret scan found no committed Supabase, Anthropic, database, or Resend secret values.
- Data/security review passed with no blocking findings after queue freshness, retry, and idempotency fixes.
- `npx supabase db lint --local` could not run because local Postgres at `127.0.0.1:54322` is unavailable.

## Residual Risks

- Local Supabase RLS execution remains unverified because local Supabase/Postgres is unavailable.
- Edge Function code is Deno runtime code and is excluded from the Next.js typecheck; deploy-time verification is still required.
- Email provider behavior and retry timing have not been exercised against live Resend.
