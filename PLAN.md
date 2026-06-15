# Tank Copilot — Full MVP Build Plan

> Project-local copy of the approved build plan (canonical: `~/.claude/plans/c-users-chris-desktop-tank-copilot-mvp-snazzy-codd.md`). Written for independent verification by Codex.

## Context

**Why this work:** `F:\Development\Tank Copilot` is an empty greenfield directory. The MVP Product Document (`Tank_Copilot_MVP_Product_Document.docx`, 15 Jun 2026) is a complete product spec: a mobile-first PWA that turns aquarium water-test data + symptoms + tank history into **safe next actions** and a **shareable report**. The product's defining constraint is *deterministic safety rules first; AI only explains, asks follow-ups, summarises, and drafts reports — it never diagnoses.* Incorrect advice can kill livestock or damage expensive reef systems, so safety/trust is the central design pressure.

**Goal:** Build the full 90-day MVP as a sequence of shippable vertical slices — Phase 0A ends with reviewed discovery/spec evidence, and each implementation phase after 0A ends with a deployable, usable increment and passing verification — rather than one big-bang build.

> **Plan status:** Reviewed via compound-engineering multi-persona review (2026-06-16, 2 rounds) and Codex docx/plan verification. Fixes and recommendations are incorporated inline where actionable; remaining decisions are tracked under [Deferred / Open Questions](#deferred--open-questions).

**Decisions locked during grill (`/grill-with-docs`):**

| Area | Decision |
|------|----------|
| Scope | Full 12-week roadmap, delivered phase-by-phase |
| Stack | Next.js 15 (App Router, TS) · Tailwind · shadcn/ui · Supabase (Auth/Postgres/RLS/Storage/Edge Fns) · Stripe · PostHog · Anthropic Claude (AI layer) · Vercel |
| Credentials | Have: Stripe, Vercel, PostHog. Need: **Supabase project** (Phase 0 setup), **Anthropic key** (optional — AI stays feature-flagged until added) |
| Rules engine | Draft conservative **Rules v0** from doc §8 + its cited public sources; every rule tagged `rule_id` + `confidence` + `why` + `source`; **actionable advice/report surfaces require at least two domain reviewer sign-offs**. Before sign-off, only internal QA or info-only educational summaries may ship, with no urgent checklist/actions/shareable recommendations (see Rules engine & safety) |
| Onboarding | **Auth-first**, passwordless magic link + Google OAuth |

## Architecture overview

- **Single Next.js 15 app** (App Router, TypeScript, React Server Components). No monorepo. Installable **PWA** (manifest + service worker, offline shell for dashboard).
- **Supabase** as backend: Auth (magic link + Google OAuth), Postgres with **Row Level Security** on every table, Storage bucket for photos, Edge Functions for report generation + scheduled reminders (pg_cron).
- **Rules engine** = pure, dependency-free TypeScript module (`lib/rules/`). Deterministic. Runs server-side for authoritative results and can run client-side for instant feedback. Input: tank context + a water test (or triage observation). Output: `{ severity, flags[], checklist[], rule_ids[], confidence, explanations[] }`. **This is the product; it is TDD'd first** (safety-critical).
- **AI layer** (`lib/ai/`) = server-only, gated behind `AI_ENABLED` flag + presence of `ANTHROPIC_API_KEY`. It receives the *already-computed deterministic output* and only (a) rewrites rule explanations into plain language, (b) drafts report prose, (c) generates follow-up questions for missing context. It **cannot** change severity, invent thresholds, diagnose, or prescribe dosing. **Data minimization:** prompts use task-specific allowlisted DTOs and carry only derived results (severity, checklist, explanations) + denormalized tank type/volume — never PII (user/customer names, emails, locations), raw identifiers, share IDs, photos, client contact, or free-text notes. Anthropic usage must rely on API/commercial no-training terms; require explicit approval before any non-ZDR/retained-prompt feature. When disabled or on failure, the app falls back to deterministic templated text and is fully functional.
- **Stripe** subscriptions → entitlements table → server-side plan gates. **PostHog** for activation/retention/paywall funnel. **Vercel** hosting + preview deploys.

## Project structure (target)

```
tank-copilot/
├── src/
│   ├── app/
│   │   ├── (marketing)/            # public landing + report share pages
│   │   │   └── r/[shareId]/        # public read-only shared report
│   │   ├── (auth)/login/           # magic-link + Google
│   │   ├── (app)/                  # authed shell
│   │   │   ├── dashboard/
│   │   │   ├── tanks/[id]/
│   │   │   ├── tanks/[id]/test/    # add water test
│   │   │   ├── tanks/[id]/triage/  # symptom intake
│   │   │   ├── tanks/[id]/livestock/
│   │   │   ├── maintenance/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── (commercial)/           # business/client mode (feature-flagged)
│   │   └── api/                    # route handlers (reports, stripe webhook, ai)
│   ├── components/                 # shadcn/ui + app components
│   ├── lib/
│   │   ├── rules/                  # engine + versioned rule config + tests
│   │   ├── ai/                     # Claude client, prompt templates, fallback
│   │   ├── supabase/               # server + browser clients, RLS helpers
│   │   ├── reports/                # report builder (markdown/text → HTML → PDF)
│   │   ├── entitlements/           # plan gates
│   │   └── analytics/              # PostHog wrappers
│   └── types/
├── supabase/
│   ├── migrations/                 # SQL schema + RLS policies
│   └── functions/                  # edge functions (report, reminders)
├── public/                         # PWA manifest, icons, service worker
├── CONTEXT.md                      # domain glossary (grill-with-docs convention)
└── docs/adr/                       # architecture decision records
```

Scaffolding via `create-next-app`, `shadcn` CLI, `supabase` CLI — no hand-rolled boilerplate.

## Execution workflow & review gates

- Use **Superpowers** workflows where they fit the phase: TDD for safety-critical rules/RLS/payment behavior, systematic debugging for defects, and verification-before-completion before any phase is marked done.
- Use **Compound Engineering** throughout: `ce-plan` for plan changes, `ce-work` for implementation, `ce-doc-review` for document passes, `ce-code-review` for code diffs, `ce-frontend-design` for UI work, `ce-test-browser` for browser validation, and `ce-commit` for final commit preparation.
- Use **GStack/browser QA** once a browser-visible route exists: smoke core journeys, capture responsive evidence, inspect console/network failures, and keep the result with the phase update.
- Use **subagents** for independent lanes and review: data/RLS, rules/safety, UI/UX, integrations/payments, and QA/review. Lanes must have non-overlapping ownership and must not overwrite another agent's edits.
- Ask clarifying questions before product/security decisions with lasting impact: Supabase project choice, source thresholds, report redaction, image/PDF runtime, email provider, pricing, validation gates, and domain-review acceptance.
- Run a dedicated **design-review** after the UI is functionally complete and before launch polish/beta handoff. The UI is not "finalised" until findings are fixed or explicitly deferred.

## Data model (Postgres + RLS)

Maps doc §9.2 entities. Every row owned via `user_id` (hobby) or `business_id` (commercial); RLS enforces owner-only read/write. Shared reports are exposed only through a server route or narrowly-scoped RPC that requires an exact share token and returns a sanitized projection — never by granting anonymous direct table scans on `reports`. Store `rule_version` + original inputs + generated recommendation for **auditability** (doc §9.3).

| Table | Key fields | RLS posture |
|-------|-----------|-------------|
| `profiles` | id(=auth.uid), email, plan, role | self only |
| `tanks` | id, user_id, business_id?, client_id?, name, type(fw/reef/planted), volume, unit_system, start_date, water_source, target_ranges(jsonb) | owner |
| `water_tests` | tank_id, tested_at, ammonia, nitrite, nitrate, ph, temp, salinity, kh, gh, phosphate, calcium, magnesium, notes, photo_path | via tank ownership |
| `livestock` | tank_id, species_name, common_name, quantity, added_at, status, notes, photo_path | via tank |
| `tank_equipment` | tank_id, category(heater/filter/light/skimmer/media/etc), name, installed_at, status, notes | via tank |
| `equipment_events` | tank_id, equipment_id?, event_type(change/failure/cleaning/replacement), happened_at, notes | via tank |
| `maintenance_tasks` | tank_id, title, category, cadence_days, last_completed, next_due | via tank |
| `observations` | tank_id, symptoms(jsonb), affected_livestock, photos, recent_changes, severity, created_at | via tank |
| `recommendations` | tank_id, source_event_id, source_type, severity, rule_ids, rule_version, explanation, checklist(jsonb), confidence | via tank |
| `reports` | tank_id, **owner_user_id**, business_id?, type(community/lfs/service), generated_at, content, sanitized_public_content, **share_id(unique, ≥128-bit random)**, **share_enabled(bool, default FALSE)**, **share_expires_at?**, pdf_path | owner write/read; public access only through sanitized route/RPC |
| `businesses` | owner_id, name, logo_path, plan | owner/team |
| `team_members` | business_id, user_id, role(admin/editor/viewer) | business team |
| `clients` | business_id, name, contact, location, notes | business team |
| `entitlements` | user_id/business_id, plan, stripe_customer, status, limits | self |
| `webhook_events` | stripe_event_id(unique), processed_at | service-role only |

**Public share boundary (the highest-risk authz boundary):** direct anonymous `reports` table SELECT stays denied. `/r/[shareId]` uses a server route or `SECURITY DEFINER` RPC that requires an exact token match, checks `share_enabled` + expiry/revocation, rate-limits access, returns only a `PublicReportV1` sanitized DTO, and serves `noindex`. `PublicReportV1` is an explicit allowlist: report title/type, tank type, rounded volume/unit, generated_at, rule version, severity, reviewed rule explanations, checklist only when rules are signed, open questions, and generic next steps. It excludes owner/client names, email/contact/location, raw notes, raw IDs, share IDs, full history, private photo paths, unsigned-rule actions, and internal audit fields. Share tokens are cryptographically random (≥128-bit, e.g. nanoid/UUIDv4), never sequential; `share_enabled` defaults **FALSE** (sharing is opt-in) and public links default to expiring unless the owner explicitly extends them. Owner-only writes are a separate policy — INSERT/UPDATE/DELETE require `auth.uid() = owner_user_id` or the appropriate business role. Automated tests must prove an anonymous client can view a single shared report by exact token but **cannot** run `from('reports').select('*')` to list enabled reports; golden redaction tests compare full reports against `PublicReportV1`.

**Photos:** private `photos` bucket (signed URLs, short expiry); `report-pdfs` bucket. Uploads validated for MIME type (jpeg/png/webp), size cap (~5 MB), and server-side re-encode (sharp, lossless, **before** storage) to strip EXIF/IPTC/XMP metadata — so geotagged photos never land in the bucket un-stripped. If using `sharp`, run this in a Node.js route/function; only use Supabase Edge/Deno if an Edge-compatible image pipeline is proven first.

**PDF/report artifacts:** generated PDFs are private by default. Owner PDFs are served only through owner-authorized routes; public PDFs, if enabled, are generated from `PublicReportV1` only and served through the same exact-token share boundary. PDF HTML must be template-only with escaped user content, disabled JavaScript/network loads, internal signed image URLs, explicit runtime/memory limits, and no direct bucket-public access.

## Phased delivery

Phase 0A is a discovery/specification gate. Each implementation phase after 0A = a shippable slice with its own verification. Roadmap-week mapping in parentheses.

### Phase progress tracker

Use these checkboxes for phase updates. Do not mark a box complete until the implementation or evidence exists.

#### Phase 0A — Discovery, prototype & safety specification
- [ ] 15-25 discovery interviews completed or explicitly waived.
- [ ] Clickable prototype and sample tank reports reviewed.
- [ ] `docs/rules/rules-v0-spec.md` drafted with thresholds, canonical units, tank applicability, sources, and reviewer status.
- [ ] Source registry created with URLs/access dates for safety-critical claims.
- [ ] At least two rules reviewers identified.

#### Phase 0B — Foundation & setup
- [ ] Next.js/Supabase/Vercel/PostHog scaffold boots locally and deploys.
- [ ] Auth/client/server env handling documented in `.env.example`.
- [ ] Base RLS migration and tests created.
- [ ] PWA shell installed and smoke-tested.
- [ ] Compound/Superpowers verification pass recorded before phase close.

#### Phase 1 — Auth, tanks, water tests, dashboard
- [ ] Magic-link and Google auth protect the app shell.
- [ ] First tank onboarding captures tank type, volume, age, units, water source, and equipment baseline.
- [ ] Water-test logging supports required parameters, notes, photo upload, validation, and history.
- [ ] Dashboard shows latest state and useful first-value empty states.
- [ ] Cross-user RLS test passes.
- [ ] GStack/browser smoke covers onboard -> test -> dashboard.

#### Phase 2A — Rules engine core
- [ ] Rules tests written before implementation.
- [ ] Rules v0 config includes thresholds, sources, confidence, missing-data behavior, and tank-type applicability.
- [ ] Unit conversion, missing-data, tank-type mismatch, and panic-flow cases pass.

#### Phase 2B — Result UI and recommendations
- [ ] Result UI consumes real Phase 1 tank/test data.
- [ ] Domain reviewer sign-off recorded before user-facing advice ships, or advice surfaces remain internal/info-only.
- [ ] Independent rules/safety review completed.

#### Phase 3 — Triage, reports, and share links
- [ ] Symptom triage creates structured observations and safe follow-up prompts.
- [ ] Report builder creates deterministic report content with AI optional/fallback parity.
- [ ] `PublicReportV1` allowlist, exclusions, default expiry, and golden redaction tests are implemented.
- [ ] Public share route/RPC returns sanitized content by exact token only.
- [ ] Revocation, expiry, rate-limit, `noindex`, and incognito checks pass.
- [ ] AI guardrail tests pass for severity immutability, no PII, and red-severity urgency.
- [ ] GStack/browser smoke covers triage -> report -> share -> revoke.

#### Phase 4 — Retention and breadth
- [ ] Maintenance tasks, reminders, and retry/failure behavior work.
- [ ] Trends and CSV/JSON export cover full tank history.
- [ ] Livestock and stocking planner v0 use sourced warning language, confidence, and safer alternatives.
- [ ] Reef parameters and stability guardrails are active.
- [ ] Export/delete and health-data boundaries are visible in settings or documented for Phase 6 completion.

#### Phase 5 — Commercial mode
- [ ] Business, team, client, and client-tank flows are feature-flagged behind entitlement.
- [ ] Business RLS helper functions are locked down and reused across business-scoped tables/storage.
- [ ] Team membership invariants are implemented and tested.
- [ ] Cross-business isolation and role-gated write tests pass.
- [ ] Branded report/PDF runtime is chosen, documented, and verified.
- [ ] Pilot/LOI validation gate is reviewed before broad commercial build-out.

#### Phase 6 — Payments, analytics, and launch polish
- [ ] Stripe checkout/webhook/entitlement transitions are transactional and replay-safe.
- [ ] Plan gates and one-emergency-report-free behavior are verified.
- [ ] AI/analytics DTO allowlists and outbound payload snapshot tests pass.
- [ ] PostHog funnel events and source-doc success metrics are checked.
- [ ] Account/tank export, deletion, retention, and affiliate/product transparency are complete.
- [ ] Accessibility/Lighthouse/PWA checks pass on preview.
- [ ] Final UI design-review findings are fixed or explicitly deferred.
- [ ] Final GStack/browser pass covers mobile and desktop core journeys.

### Phase 0A — Discovery, prototype & safety specification (Week 1)
- Preserve the source doc's discovery track before or alongside scaffolding: 15-25 interviews, clickable prototype/Figma, and sample tank reports.
- Create `docs/research/source-registry.md` with actual URLs, access dates, and which claims each source supports.
- Draft `docs/rules/rules-v0-spec.md` from doc §8 + cited sources: thresholds, canonical units, tank-type applicability, source, confidence, missing-data behavior, and reviewer sign-off status.
- Identify at least two domain reviewers (aquatic vet, experienced aquarist, or LFS/operator); define acceptance criteria for Rules v0 sign-off.
- **Verify:** prototype/report examples reviewed; source registry exists; Rules v0 spec has traceable sources and reviewer owners.

### Phase 0B — Foundation & setup (Weeks 1-2)
- `create-next-app` (TS, App Router, Tailwind), init shadcn/ui, ESLint/Prettier, Vitest, Playwright.
- Init git repo (dir is not currently a repo). `.env.example` with all keys.
- **You create the Supabase project**; wire `@supabase/ssr` server+browser clients, local `supabase` CLI, first migration (profiles + RLS).
- PWA manifest + base service worker. Deploy skeleton to Vercel; wire PostHog.
- **Rules sign-off tracking starts here:** use the reviewers identified in Phase 0A; sign-off on Rules v0 thresholds is required before Phase 2 user-facing advice and Phase 3 reports.
- **Verify:** app boots, deploys green, PostHog receives a pageview, Supabase connection works; app boots with `ANTHROPIC_API_KEY` unset and `AI_ENABLED=false`.

### Phase 1 — Auth + tanks + water-test logging + dashboard (Weeks 3-4)
- Magic-link + Google OAuth (`(auth)/login`), session middleware, protected `(app)` shell.
- Onboarding: create first tank (`< 90s`, FR1) — type/volume/age/units/water source/equipment baseline → seeds target ranges + suggested cadence.
- Add water test form (FR2): core params + notes + optional photo (validated), instant write, appears on dashboard/history. Client-side validation requires the tank-type's critical params before submit, so a saved test always yields a result.
- Dashboard: tank selector, status placeholder, latest readings, due-tasks placeholder.
- **Verify:** create tank → log test → see it on dashboard/history, all behind auth, RLS blocks cross-user access (automated RLS test).

### Phase 2A — Rules engine core (Weeks 3-4, parallel with Phase 1)
- **TDD the engine first:** write `lib/rules/*.test.ts` from `docs/rules/rules-v0-spec.md`, then implement. Versioned config (`rules.v0.ts`), per-tank-type modifiers, severity (red/yellow/green), checklist generator, confidence, "why + source" per rule, conservative defaults (err toward earlier warning). Disclaimer banner.
- **Unit & missing-data handling:** all thresholds internal in canonical units; imperial inputs converted on write (tested against published tables). When a *critical* parameter for the tank type is missing, the engine never fabricates a score or a false all-clear — it persists a yellow "data incomplete — cannot assess risk" recommendation that prompts a re-test (not a blank/no-result card).
- **Tank-type validation:** flag contradictions (e.g. salinity entered on a freshwater tank; reef parameters on `fw`) and prompt tank-type correction; document the valid parameter set + range per tank type.
- **Verify:** unit tests cover toxicity/cycling/drift cases (high ammonia/nitrite ⇒ urgent + safe checklist); unit-conversion + missing-data + tank-type-mismatch tests; golden-case snapshot tests; manual run of panic-test flow. No user-facing advice ships from 2A.

### Phase 2B — Result UI + recommendations (after Phase 1 tank/test flow exists)
- Results screen (FR3, FR4): flags, top action, plain-language explanation, "generate report" CTA. Persist `recommendations` with `rule_version`.
- Until Rules v0 is signed off, user-facing surfaces are limited to internal QA or info-only educational summaries clearly marked "rules under expert review" — no urgent checklist/actions/shareable recommendations.
- **Verify:** result journey consumes a real saved water test; panic-test flow renders correctly; **expert sign-off recorded before any actionable advice/report surface ships.**

### Phase 3 — Symptom triage + report generator + share links (Weeks 5-6)
- Triage intake (FR5): symptom categories, recent changes, quarantine, affected livestock, optional photos → structured summary + missing-data prompts + safe next steps (uses rules engine, never final diagnosis).
- Report builder (FR7): assembles tank context + latest params + symptoms + equipment context + tasks + open questions → copyable text + **public share link** (`/r/[shareId]`, no auth to view, revocable, expiring by default, rate-limited, noindex, `PublicReportV1` projection only) + "Powered by Tank Copilot" watermark on free tier.
- **AI layer wired here, feature-flagged:** if `ANTHROPIC_API_KEY` present, Claude polishes explanation + report prose + follow-up questions; else deterministic templates. Server-only; data-minimized (no PII; prompts exclude free-text user notes); 5s timeout via `AbortController` (budgeted against Vercel cold-start — widen if preview shows tight margins) with deterministic fallback on failure or timeout; safety boundaries enforced (doc §8.3).
- **Verify:** triage → report → open share link in incognito; AI on/off both produce safe, complete reports; AI cannot alter severity **and AI prose contains no deferral/softening language on red-severity rules** (prose-intent test); AI failure falls back to template; share link revocation returns 410; `PublicReportV1` golden redaction tests pass.

### Phase 4 — Retention + breadth (Weeks 7-8)
- Maintenance scheduler (FR6): recurring tasks, one-tap complete/reschedule, adaptive cadence from tank state. Edge Function + pg_cron + email reminders (FR12, email-first).
- Trends + CSV/JSON export (FR11). Livestock list (FR8) + Stocking planner v0 (FR9): tank-size/group/temperament/water-fit warnings with confidence + safer alternatives.
- **Reef parameters** activated (salinity, alk, Ca, Mg, phosphate) + reef rule set + "don't change too fast" guardrails.
- **Verify:** task completes in one tap + reschedules; reminder fires; export downloads full history; stocking output remains warning/confidence-based; reef test produces stability-aware output.

### Phase 5 — Commercial mode (Weeks 9-10)
- `businesses` + `team_members` (roles: admin/editor/viewer) + `clients`; client tanks separated from personal via RLS. **Business RLS primitives:** create locked `SECURITY DEFINER` helpers such as `is_business_member`, `has_business_role`, and `can_manage_membership` with fixed `search_path`, then reuse them across every business-scoped table and storage path. **Tank read policy:** `(user_id = auth.uid() AND business_id IS NULL) OR is_business_member(business_id, auth.uid())`. **Writes are role-gated:** INSERT/UPDATE/DELETE additionally require `has_business_role(business_id, auth.uid(), ARRAY['admin','editor'])` (viewers are read-only). Index `team_members(user_id, business_id)` — these checks run on every business read/write. **Membership invariants:** admin-only membership mutation, no self-promotion, no editor/viewer membership mutation, no last-admin removal, and downgrade/revocation tests while a session is active. **Offboarding:** admins INSERT/DELETE memberships (hard delete); RLS is re-evaluated per request, so revoked access yields 403 mid-session → client redirects to dashboard. Branded report (FR10): business name/logo, client contact, before/after photos → HTML→PDF; **branded reports omit the Tank Copilot watermark** (business brand is the identifier).
- Feature-flagged behind commercial entitlement.
- **Verify:** business user creates client → logs test → generates branded PDF with logo; cross-business isolation test (Business A cannot read Business B's clients/tanks/reports/storage paths); viewer/editor/admin tests pass across every business-scoped table; hobby user cannot see commercial features/data.

### Phase 6 — Payments + analytics + launch polish (Weeks 11-12)
- Stripe subscriptions + webhook → `entitlements`; plan gates (Free / Hobby Pro / Reef Pro / Service Pro / LFS). Keep one emergency report free (doc §10.1); watermark on free.
- **Webhook hardening:** verify `Stripe-Signature` via `constructEvent` (reject invalid with 400 before any mutation); idempotency via `webhook_events(stripe_event_id unique)` using `INSERT ... ON CONFLICT (stripe_event_id) DO NOTHING RETURNING` — process only when a row is returned, so concurrent Stripe retries can't double-process; also dedupe relevant `data.object.id + event.type` transitions where Stripe can issue duplicate Event objects. Signature-verify + dedup insert + entitlement transition + processed marking run in one transaction/RPC; explicit entitlement transition map (valid upgrades/downgrades; downgrade timing).
- PostHog funnel events: activation, first-value, report-use, retention, paywall, commercial-intent. Track source-doc success gates: 60% first-test completion, 35% second log within 14 days, 70% report usefulness, 5 paid pilots/LOIs for commercial reporting, >80% helpful rating, and zero high-severity safety incidents.
- Marketing landing page. PWA install polish, accessibility pass, disclaimer/settings, account/tank export + deletion, retention policy, and affiliate/product recommendation transparency.
- **Verify:** test-mode checkout upgrades entitlement and unlocks gated feature; forged/unsigned webhook rejected; replayed event is a no-op; duplicate-object/type event is a no-op or valid transition only; downgrade locks the gated feature; funnel events land in PostHog; privacy/export/delete paths work; Lighthouse PWA/a11y pass; final design-review and GStack/browser pass completed.

## Rules engine & safety (detail)

- Config shape: `{ id, param, condition, tankTypes[], severity, message, why, source, confidence }`. Engine evaluates all applicable rules → highest severity wins → dedup checklist.
- **Rules v0 spec:** thresholds live first in `docs/rules/rules-v0-spec.md` with source URLs, access dates, canonical units, tank-type applicability, missing-data behavior, confidence, and reviewer status. Code is generated/implemented from that spec, not from undocumented memory.
- **Expert-review gate:** Rules v0 is drafted conservatively from doc §8 + cited public sources, but **actionable advice/report surfaces require at least two domain reviewer sign-offs** (gate opens Phase 0A, must close before Phase 2B user-facing advice or Phase 3 reports). Before sign-off, only internal QA or info-only educational summaries may ship, with no urgent checklist/actions/shareable recommendations and a clear "rules under expert review" banner.
- Safety language (doc §8.2): "possible causes to investigate" / "safe first checks" — never definitive diagnosis. Severe symptoms ⇒ escalate to aquatic vet / experienced LFS. Separate emergency stabilisation (water quality, temp, O₂) from diagnosis. No precise medication/chemical dosing in MVP. Every recommendation shows confidence + why.
- AI allowed: summarise allowlisted derived history, ask missing-context Qs, translate rules to plain language, draft community-post text, classify broad symptom categories. AI forbidden: final photo diagnosis, prescribe dose, override rules, claim certainty on missing data, recommend large rapid corrections, **soften the urgency of a red-severity rule in prose**, or receive photos/free text/client contact/raw IDs/share IDs in prompts/logs/analytics.

## Verification strategy

- **Rules engine:** Vitest unit + snapshot tests, written first (TDD), incl. unit-conversion, missing-data, and tank-type-mismatch cases. The safety contract is the test suite.
- **RLS:** automated cross-user (and cross-business) access tests against local Supabase (deny by default); explicit anonymous shared-report tests for exact-token access through the route/RPC and denial of direct `reports` table listing.
- **E2E/browser:** Playwright plus GStack/browser QA drive the core journeys (onboard → test → result → report → share) per phase, with mobile and desktop evidence once UI routes exist.
- **AI guardrails:** tests asserting AI never changes severity, never softens red-severity prose, sends no PII, and disabled/failure-mode parity. Define per-task AI DTO allowlists; snapshot-test outbound AI and analytics payloads; mask/disable PostHog autocapture where it could capture form inputs or report content.
- **Payments:** signature-rejection + idempotent-replay + downgrade tests.
- **Funnel:** confirm PostHog events fire at each activation step.
- **Design review:** after the UI is functionally complete, run design-review before launch polish/beta handoff; findings must be fixed or explicitly deferred.
- **Review lanes:** use subagents/reviewers for independent high-risk lanes before phase closure: data/RLS, rules/safety, AI/privacy, payments, and UI/UX.
- **Deploy:** Vercel preview green + Lighthouse PWA/a11y before each phase is "done."

## Prerequisites (Chris)
1. Create a **Supabase** project; provide URL + anon + service-role keys (Phase 0 blocker). **Service-role key is server-only** (Edge Functions / API routes), env-injected (Vercel secrets / `.env.local`), never in browser bundles, never committed. Browser uses the anon key only.
2. (Optional now) **Anthropic API key** to switch the AI layer on — not required to ship Phases 1-2.
3. Stripe **test-mode** keys + price IDs (needed Phase 6).
4. PostHog project key + Vercel project link (Phase 0).
5. Line up at least two **rules reviewers** (aquatic vet / experienced LFS operator / experienced aquarist) so sign-off lands before Phase 2 user-facing advice and Phase 3 reports.

## Out of MVP (deferred, per doc §3/§4)
Hardware/controller integrations, marketplace/classifieds, public social feed, full species database, native mobile app, automated dosing control, AI photo *diagnosis*.

## Conventions
- On first implementation pass, create `CONTEXT.md` (domain glossary: Tank, WaterTest, Observation, Recommendation, Report, Client vs User, etc.) and `docs/adr/` (e.g. ADR-0001 deterministic-rules-over-AI, ADR-0002 Supabase-RLS-as-authz, ADR-0003 share-token-security, ADR-0004 AI-data-minimization).
- `§N` references point to `Tank_Copilot_MVP_Product_Document.docx` (v15-Jun-2026); safety-critical rules are inlined into `CONTEXT.md` and `docs/rules/rules-v0-spec.md` at Phase 0 so the build is not blocked on the .docx.
- Authoring and review kept as separate passes; safety-critical code (rules, RLS, AI boundary) gets an independent review/verify pass before each phase closes.
- Phase updates use the checklist above: mark only completed work, include verification evidence, review findings, residual risks, and next clarifying decisions.

## Note on size
This is a multi-week, multi-session build. On approval, start at **Phase 0** and proceed slice-by-slice, checking in at phase boundaries rather than attempting the whole roadmap in one pass.

## Deferred / Open Questions

### From 2026-06-16 compound-engineering review
Tracked for phase execution; some items are now incorporated inline above and remain here as audit trail / phase reminders. (Strategic items reflect the deliberate choice to build the full roadmap; they are recorded as on-record tradeoffs.)

- **(P1, Phase 1) Onboarding-to-first-value flow** — Is the dashboard useful before the first water test, or is a test required to unblock value? Define the post-tank-creation empty state + "Log your first test" CTA so signup momentum isn't lost on a dead screen.
- **(P1, Phase 2) Panic/emergency water-test flow UX** — Entry point, how an urgent (red) result is presented (banner vs takeover), checklist persistence, and escalation copy ("contact an aquatic vet now"). Currently only a verification line.
- **(P1, Phase 2) Results-screen states** — Loading / error / empty (all-clear) / stale-data states for the product's payoff screen.
- **(P1, Phase 3) Public shared-report view** — What the public page shows vs hides (hide email/full history/photos), 404/expired behavior, and the in-app share affordance.
- **(P1, Phase 3) PDF generation approach on Vercel** — Library + runtime choice (react-pdf vs headless vs external service) given Edge size limits; decide before Phase 3/5 build.
- **(P1, Phase 4) pg_cron + email reminder architecture** — Trigger path (pg_cron → http_request/database webhook), email service (e.g. Resend), Deno-vs-Node constraint, and failure/retry handling.
- **(P1, Strategy) Validation checkpoint before expansion** — Whether to gate Phases 3-6 on a core-loop success metric (e.g. ≥35% second-log within 14 days) before investing in commercial/reef/payments. Full roadmap chosen deliberately; this records the sequencing risk + optional gate.
- **(P1, Strategy) Product positioning shift** — Plan expands the source doc's narrow "triage specialist" into a broader toolkit; state the intended identity so phases 3-6 don't drift.
- **(P1, Data model) Defer commercial schema** — Option to move `business_id`/`client_id` + commercial tables to a Phase 5 migration to keep phases 1-4 RLS simpler; weigh against migration churn.
- **(P2, Phase 0/6) PWA service-worker** — Deploy path + `Cache-Control`/`Service-Worker-Allowed` headers (vercel.json); offline test on a preview deploy.
- **(P2, Phase 1) Mobile numeric input UX** — Input types (numeric keypad), inline expected ranges, as-you-type validation, draft save, presets for the ~10-12 water-test fields.
- **(P2, Phase 2) Severity/disclaimer/confidence surfacing** — Confidence-based copy prefixes, investigative vs imperative phrasing, always-visible disclaimer, red-severity confirm-on-dismiss.
- **(P2, Phase 3) AI-vs-deterministic UX parity** — Whether AI is a silent quality upgrade (no toggle/label), latency/skeleton handling, and storing `generated_with_ai` so public reports render stably.
- **(P2, Data model) Rules versioning retroactive display** — How to show a recommendation computed under an older `rule_version` when current rules differ (indicator + "recompute" vs always-recompute).

### Integrated from 2026-06-16 Codex docx/plan verification
Tracked after comparing this plan against `Tank_Copilot_MVP_Product_Document.docx`. Items below are retained as audit trail / phase reminders; where noted as integrated, the plan body above already reflects the recommendation.

- **Integrated (P0, Security/RLS) Replace public table SELECT for shared reports** — Plan now denies anonymous direct `reports` table SELECT and requires exact-token route/RPC access with a sanitized projection and list-scan denial tests.
- **Integrated (P1, Data model/RLS) Fix report ownership fields before writing policies** — Plan now includes immutable `owner_user_id` plus optional `business_id`; implementation must keep owner writes and public route/RPC reads separate.
- **Integrated (P1, Rules engine) Create an explicit Rules v0 specification** — Phase 0A now requires `docs/rules/rules-v0-spec.md` before TDD implementation.
- **Integrated (P1, Safety gate) Keep expert sign-off before user-facing recommendations** — Phase 2B advice/report surfaces remain internal/info-only until sign-off lands.
- **Integrated (P1, Phase 0) Restore the source doc's discovery/prototype work** — Phase 0 is now split into `0A Discovery/prototype` and `0B Foundation`.
- **Integrated (P1, Data model) Add equipment context** — Data model, onboarding, and report builder now include equipment context.
- **Integrated (P1, Payments) Harden Stripe webhook dedupe beyond event ID** — Phase 6 now requires event-id idempotency plus relevant `data.object.id + event.type` dedupe and transactional entitlement transitions.
- **Integrated (P1, Commercial RLS) Add membership invariants** — Phase 5 now includes admin-only mutation, no self-promotion, no editor/viewer mutation, no last-admin removal, and revocation/downgrade tests.
- **Integrated (P2, Privacy/trust) Add export/delete and health-data boundaries** — Phase 4/6 now track export/delete, retention, and affiliate/product recommendation transparency.
- **Integrated (P2, Rules review) Use at least two domain reviewers** — Phase 0A and the rules safety gate now require at least two domain reviewers.
- **Integrated (P2, Runtime) Pin image sanitization runtime** — Photo sanitization now specifies Node.js for `sharp` unless an Edge-compatible path is proven.
- **Integrated (P2, AI/privacy) Make Anthropic retention terms explicit** — AI section now requires API/commercial no-training terms and explicit approval before non-ZDR/retained-prompt features.
- **Integrated (P2, Product validation) Promote source metrics to gates** — Phase 6 now tracks source-doc success gates.
- **(P2, Stocking planner) Keep compatibility guidance non-definitive until sourced** — Until a source-backed species dataset exists, present stocking output as warnings with confidence and safer alternatives, not definitive compatibility decisions. Allow pro/user overrides with audit notes.
- **(P2, Research traceability) Preserve source registry** — Turn the docx research sources into a repo-local `docs/research/source-registry.md` or ADR with actual URLs, access dates, and how each source informs rules/product decisions; "Open source" is not sufficient for reproducible safety work.

---

## Future reviewer checklist

Use this checklist for future independent plan reviews. Focus on:
1. **Technical feasibility** on the named stack (Next.js 15 App Router + Supabase + Vercel): anything that won't work as written — Edge Function (Deno) vs Node boundaries, HTML→PDF on Vercel, pg_cron→email, PWA/service-worker on Vercel, `AbortController` timeout vs serverless limits.
2. **Security/RLS correctness**: the shared-report route/RPC boundary with no anonymous table scans, role-gated commercial writes via `team_members`, webhook idempotency (`ON CONFLICT ... RETURNING` plus object/type dedupe), service-role key handling.
3. **Rules-engine safety model**: deterministic-first with expert-gate + info-only fallback; missing-data → yellow "incomplete" (not blank, not false all-clear); AI prose-intent guardrail.
4. **Sequencing**: phase ordering, Phase 1‖2A parallelism, Phase 2B dependency on the tank/test flow, and whether any phase has an unstated dependency.
5. **Gaps** prior review rounds may have missed; do not re-raise items already marked integrated unless implementation drifts from the plan.

Return findings as prioritized items (P0/P1/P2) with section + concrete fix.
