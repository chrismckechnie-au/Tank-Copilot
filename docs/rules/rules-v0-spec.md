# Rules v0 Specification

## Status

Unsigned. Not approved for user-facing actionable advice or public reports.

## Reviewer Gate

- Reviewer 1: TODO
- Reviewer 2: TODO
- Sign-off evidence: TODO
- Last reviewed: TODO

## Scope

Rules v0 will cover conservative freshwater, planted, and reef water-quality triage. This document is the source for `src/lib/rules` tests and implementation.

## Required Fields Per Rule

- `id`
- `param`
- `condition`
- `tankTypes`
- `severity`
- `message`
- `why`
- `source`
- `confidence`
- `review_status`

## Canonical Units

- Temperature: Celsius internally; convert Fahrenheit on write.
- Volume: liters internally; preserve original unit for display.
- Ammonia, nitrite, nitrate, phosphate, calcium, magnesium: ppm / mg/L as applicable.
- Salinity: specific gravity or ppt, normalized before evaluation.
- KH/GH/alkalinity: explicit unit per source before implementation.

## Missing Data Behavior

When a tank type is missing a critical parameter, the engine must return a yellow incomplete state and prompt for retest. It must not fabricate a green/all-clear result.

## Initial Rule Buckets

| Bucket | Tank types | Status | Notes |
| --- | --- | --- | --- |
| Ammonia toxicity | freshwater, planted, reef | Draft needed | Thresholds must account for pH/temp where sourced. |
| Nitrite toxicity | freshwater, planted, reef | Draft needed | Conservative urgent warning path. |
| Nitrate drift | freshwater, planted, reef | Draft needed | Tank-type-specific guidance. |
| pH instability | freshwater, planted, reef | Draft needed | Avoid rapid correction language. |
| Temperature/O2 emergency | freshwater, planted, reef | Draft needed | Escalation and stabilisation only. |
| Reef stability | reef | Draft needed | Salinity, alkalinity, calcium, magnesium, phosphate. |

## Source Requirements

Each numeric threshold must link to `docs/research/source-registry.md` with URL, access date, and applicability notes before implementation.
