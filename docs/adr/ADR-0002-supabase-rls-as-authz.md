# ADR-0002: Supabase RLS As Authorization Boundary

## Status

Accepted for MVP.

## Context

Tank Copilot stores user tanks, observations, reports, photos, and later commercial client data. Authorization must hold even when API routes change.

## Decision

Every persistent table uses Row Level Security. Hobby rows are owned by `user_id`; commercial rows are scoped by `business_id` and role helpers. Service-role access is server-only.

## Consequences

- Direct anonymous table access is denied by default.
- Public shared reports use exact-token route/RPC access to a sanitized DTO.
- RLS tests must cover cross-user, cross-business, viewer/editor/admin, revocation, and anonymous share boundaries.
- `SECURITY DEFINER` helpers must use fixed `search_path` and narrow grants.
