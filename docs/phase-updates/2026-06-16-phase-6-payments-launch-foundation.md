# Phase 6 Payments And Launch Foundation

Status: partial foundation shipped.

## Completed

- [x] Added `stripe` server dependency.
- [x] Added Stripe webhook route that verifies `Stripe-Signature` with the raw request body before mutation.
- [x] Added `entitlements` and `webhook_events` schema foundation.
- [x] Added replay-safe `process_stripe_subscription_event` RPC.
- [x] Added event-id dedupe plus object/type/state-fingerprint dedupe for duplicate Stripe event objects.
- [x] Added user/business entitlement ownership constraints and owner/business-member read RLS.
- [x] Added Stripe price-to-plan mapping and subscription event extraction tests.
- [x] Added PostHog funnel event names and kept analytics payload allowlists.
- [x] Added settings page documenting export/delete, retention, and affiliate transparency boundaries.

## Verification

- [x] `npm run check`
- [x] `npm run build`
- [x] `npm run test:e2e`
- [x] `npm audit --omit=dev`
- [x] Secret scan for committed credentials returned no matches.
- [ ] `npx supabase db lint --local` blocked: local Supabase Postgres is not running on `127.0.0.1:54322`.

## Remaining Gaps

- [ ] Apply and validate migrations against a real Supabase database.
- [ ] Add Stripe Checkout session creation and price lookup UI.
- [ ] Add live test-mode checkout verification from payment through entitlement unlock.
- [ ] Add account-wide export and deletion RPCs/routes.
- [ ] Add Lighthouse PWA/accessibility pass and final design review.
