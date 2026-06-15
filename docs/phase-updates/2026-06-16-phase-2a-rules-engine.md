# Phase 2A Rules Engine Core Update

## Phase 2A — Rules Engine Core

- [x] Rules tests written before implementation and verified red before green.
- [x] Pure `src/lib/rules` evaluator added with deterministic severity, flags, checklist, rule IDs, confidence, explanations, and missing-field handling.
- [x] Rules v0 config added with source IDs, confidence, tank-type applicability, and unsigned reviewer status.
- [x] Missing critical data returns yellow incomplete rather than false green.
- [x] Tank-type mismatch is flagged when freshwater/planted tests include reef-only parameters.
- [x] Fahrenheit-to-Celsius helper added for canonical temperature comparisons.
- [x] Safety review fixes applied for canonical salinity/KH units, non-finite values, source-specific reef thresholds, and freshwater nitrate threshold parity.
- [x] Temperature/O2 emergency rule remains deferred, but temperature-covered tests no longer return a semantic green all-clear.
- [ ] Domain reviewer sign-off still required before user-facing advice or report surfaces.

## Evidence

- Red test confirmed before implementation: `npm run test -- src/lib/rules/rules-engine.test.ts` failed because `src/lib/rules/index.ts` did not exist.
- Green targeted test after implementation: `npm run test -- src/lib/rules/rules-engine.test.ts` passed 9 tests.
- Red review-fix tests confirmed before fixes: `npm run test -- src/lib/rules/rules-engine.test.ts` failed 6 tests for salinity/KH canonical units, temperature-unscored semantics, nitrate threshold parity, source-specific reef thresholds, and non-finite critical values.

## Residual Risks

- Rules are deliberately unsigned and remain internal QA only.
- Numeric thresholds need domain-review confirmation before Phase 2B exposes actionable advice.
- Temperature/O2 escalation still needs a stronger source and reviewer acceptance before implementation.
