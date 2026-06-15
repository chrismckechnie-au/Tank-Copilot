# Tank Copilot Context

## Product Boundary

Tank Copilot helps fishkeepers and aquarium professionals turn water tests, tank history, symptoms, and maintenance context into safe next actions and shareable reports.

The MVP must never present AI-generated diagnosis as fact. Deterministic rules own severity, checklist actions, confidence, and safety escalations.

## Core Terms

- **Tank:** A user's aquarium, including type, volume, age, water source, equipment baseline, target ranges, livestock, maintenance history, and readings.
- **WaterTest:** A dated set of water parameters. Critical parameters vary by tank type and must not silently produce an all-clear if missing.
- **Observation:** A symptom or issue report, including affected livestock, recent changes, and optional photos.
- **Recommendation:** A deterministic rules-engine result with severity, flags, rule IDs, confidence, explanations, and checklist output.
- **Report:** A generated summary for community, LFS, service, or commercial use. Public reports must use `PublicReportV1`.
- **PublicReportV1:** A sanitized DTO returned by exact-token share routes/RPCs. It excludes owner/client identity, contact, raw notes, raw IDs, share IDs, private paths, full history, unsigned-rule actions, and internal audit fields.
- **Business:** A commercial account that owns clients, team membership, client tanks, branded reports, and role-gated permissions.

## Safety Rules

- Actionable advice/report surfaces require at least two domain reviewer sign-offs for the shipped rules version.
- Before sign-off, only internal QA or info-only educational summaries may ship.
- Missing critical data must produce a yellow/incomplete state, never a false all-clear.
- Severe symptoms escalate to an aquatic vet or experienced LFS/operator.
- MVP does not prescribe precise medication or chemical dosing.
- AI cannot alter severity, invent thresholds, prescribe dosing, soften red-severity urgency, or receive PII/free-text/photo/raw-ID payloads.

## Phase 0 Status

- Next.js/Supabase scaffold is in progress.
- Rules v0 is unsigned.
- Public report sharing is not implemented.
- Supabase anon key is still needed for browser auth.
