# Tank Copilot Agent Notes

- Treat `PLAN.md` as the canonical implementation plan.
- Do not commit secrets. `.env*` files stay ignored except examples.
- Supabase service-role and database credentials are server-only and must never be prefixed with `NEXT_PUBLIC_`.
- Public report access must go through an exact-token server route/RPC that returns `PublicReportV1`; never allow anonymous table scans on `reports`.
- Rules and recommendations are safety-critical. Use TDD for rules, RLS, AI boundaries, and payments.
- User-facing actionable advice/report surfaces require domain reviewer sign-off. Before sign-off, only internal QA or info-only educational summaries may ship.
- Keep phase updates in `docs/phase-updates/` using checkboxes and verification evidence.
