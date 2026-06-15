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
- Salinity: canonical `salinityPpt`; specific gravity must be converted before evaluation.
- KH/GH/alkalinity: canonical `alkalinityDkh`; meq/L and ppm CaCO3 equivalents must be converted before evaluation.

## Missing Data Behavior

When a tank type is missing a critical parameter, the engine must return a yellow incomplete state and prompt for retest. It must not fabricate a green/all-clear result.

## Initial Rule Buckets

| Bucket | Tank types | Status | Notes |
| --- | --- | --- | --- |
| Ammonia toxicity | freshwater, planted, reef | Implemented unsigned | Any detectable ammonia is red for internal QA; SRC-001/SRC-002. |
| Nitrite toxicity | freshwater, planted, reef | Implemented unsigned | Any detectable nitrite is red for internal QA; SRC-001. |
| Nitrate drift | freshwater, planted, reef | Implemented unsigned | Freshwater/planted >=20 ppm yellow; reef >50 ppm yellow; SRC-001/SRC-004. |
| pH instability | freshwater, planted, reef | Implemented unsigned | Freshwater/planted outside 6.5-9.0 yellow; reef outside 7.8-8.55 yellow; SRC-001/SRC-004. |
| Temperature/O2 emergency | freshwater, planted, reef | Deferred | Temperature is collected as critical data, but no temperature severity rule ships until stronger source/reviewer sign-off. |
| Reef stability | reef | Implemented unsigned | Source-specific salinity, alkalinity, calcium, magnesium, phosphate drift checks; SRC-003/SRC-004. |
| Tank-type mismatch | freshwater, planted | Implemented unsigned | Reef-only fields on non-reef tanks return yellow mismatch prompt; SRC-001. |

## Source Requirements

Each numeric threshold must link to `docs/research/source-registry.md` with URL, access date, and applicability notes before implementation.

## Implemented Unsigned Rules

These rules exist in `src/lib/rules/rules.v0.ts` for internal QA and automated tests only. They are not approved for user-facing actionable advice or public reports.

| Rule ID | Param | Tank types | Condition | Severity | Source | Reviewer status |
| --- | --- | --- | --- | --- | --- | --- |
| RULE-0001-ammonia-detectable | ammonia | fw, planted, reef | `ammonia > 0 ppm` | red | SRC-002 | unsigned |
| RULE-0002-nitrite-detectable | nitrite | fw, planted, reef | `nitrite > 0 ppm` | red | SRC-001 | unsigned |
| RULE-0003-freshwater-nitrate-drift | nitrate | fw, planted | `nitrate >= 20 ppm` | yellow | SRC-001 | unsigned |
| RULE-0004-freshwater-ph-out-of-range | pH | fw, planted | `pH < 6.5 or > 9.0` | yellow | SRC-001 | unsigned |
| RULE-0005-reef-ph-out-of-range | pH | reef | `pH < 7.8 or > 8.55` | yellow | SRC-004 | unsigned |
| RULE-0006-reef-nitrate-drift | nitrate | reef | `nitrate > 50 ppm` | yellow | SRC-004 | unsigned |
| RULE-0007-reef-salinity-drift | salinityPpt | reef | `salinity < 34 ppt or > 36 ppt` | yellow | SRC-003 | unsigned |
| RULE-0008-freshwater-reef-parameters | tank type | fw, planted | reef-only params present | yellow | SRC-001 | unsigned |
| RULE-0009-temperature-unscored | tempC | fw, planted, reef | temperature has no signed Phase 2A severity rule | yellow | SRC-002 | unsigned |
| RULE-0010-reef-alkalinity-drift | alkalinityDkh | reef | `alkalinity < 7 dKH or > 11 dKH` | yellow | SRC-003 | unsigned |
| RULE-0011-reef-calcium-drift | calcium | reef | `calcium < 400 ppm or > 550 ppm` | yellow | SRC-004 | unsigned |
| RULE-0012-reef-magnesium-drift | magnesium | reef | `magnesium < 1250 ppm or > 1400 ppm` | yellow | SRC-004 | unsigned |
| RULE-0013-reef-phosphate-drift | phosphate | reef | `phosphate > 0.3 ppm` | yellow | SRC-004 | unsigned |
