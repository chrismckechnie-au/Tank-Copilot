# ADR-0001: Deterministic Rules Over AI

## Status

Accepted for MVP.

## Context

Tank Copilot advice can affect animal health and expensive aquarium systems. AI-generated diagnosis or dosing advice is too risky for MVP.

## Decision

The rules engine owns severity, rule IDs, confidence, and checklist actions. AI is optional, server-only, and may only rewrite or summarize the deterministic result using allowlisted DTOs.

## Consequences

- Rules are tested before implementation.
- User-facing actionable advice requires domain reviewer sign-off.
- AI failures must fall back to deterministic templates.
- Prompt and analytics payloads are snapshot-tested for no PII, free text, photos, raw IDs, or share IDs.
