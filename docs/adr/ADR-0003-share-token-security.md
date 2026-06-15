# ADR-0003: Share Token Security

## Status

Accepted for MVP.

## Context

Reports are intentionally shareable, but may contain sensitive tank history, photos, and commercial client context.

## Decision

Public sharing is opt-in and served only through `/r/[shareId]` or a matching RPC that requires an exact, high-entropy token. The response shape is `PublicReportV1`, not the raw report row.

## Consequences

- Anonymous clients cannot list `reports`.
- Public links expire by default unless explicitly extended.
- Public PDFs, if enabled, are generated from `PublicReportV1`.
- Golden redaction tests compare full reports against public output.
