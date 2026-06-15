# ADR-0004: AI Data Minimization

## Status

Accepted for MVP.

## Context

AI may improve readability but increases privacy and safety risk.

## Decision

AI requests are server-only, feature-flagged, and constructed from task-specific allowlisted DTOs. Prompts exclude PII, free-text notes, raw identifiers, share IDs, photos, and client contact details.

## Consequences

- Anthropic is optional until Phase 3.
- No non-ZDR or retained-prompt feature can ship without explicit approval.
- Outbound AI and analytics payloads need snapshot tests.
- PostHog autocapture is disabled by default.
