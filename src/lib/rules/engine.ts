import { rulesV0 } from "./rules.v0";
import type {
  RuleConfidence,
  RuleDefinition,
  RuleEngineInput,
  RuleEngineResult,
  RuleSeverity,
  RuleWaterTest,
} from "./types";

const severityRank: Record<RuleSeverity, number> = {
  green: 0,
  yellow: 1,
  red: 2,
};

const confidenceRank: Record<RuleConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const criticalFieldsByTankType: Record<RuleEngineInput["tank"]["type"], Array<keyof RuleWaterTest>> = {
  fw: ["ammonia", "nitrite", "nitrate", "ph", "tempC"],
  planted: ["ammonia", "nitrite", "nitrate", "ph", "tempC"],
  reef: ["ammonia", "nitrite", "nitrate", "ph", "tempC", "salinityPpt", "alkalinityDkh"],
};

function isMissing(value: number | null | undefined) {
  return typeof value !== "number" || !Number.isFinite(value);
}

function maxSeverity(current: RuleSeverity, next: RuleSeverity): RuleSeverity {
  return severityRank[next] > severityRank[current] ? next : current;
}

function minConfidence(current: RuleConfidence, next: RuleConfidence): RuleConfidence {
  return confidenceRank[next] < confidenceRank[current] ? next : current;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function criticalMissingFields(input: RuleEngineInput) {
  return criticalFieldsByTankType[input.tank.type].filter((field) =>
    isMissing(input.waterTest[field]),
  );
}

function matchingRules(input: RuleEngineInput): RuleDefinition[] {
  return rulesV0.filter(
    (rule) => rule.tankTypes.includes(input.tank.type) && rule.matches(input),
  );
}

export function fahrenheitToCelsius(fahrenheit: number) {
  return Number((((fahrenheit - 32) * 5) / 9).toFixed(2));
}

export function evaluateWaterTest(input: RuleEngineInput): RuleEngineResult {
  const missingFields = criticalMissingFields(input);
  const matches = matchingRules(input);
  const hasIncompleteData = missingFields.length > 0;

  const severity = matches.reduce<RuleSeverity>(
    (current, rule) => maxSeverity(current, rule.severity),
    hasIncompleteData ? "yellow" : "green",
  );

  const confidence = matches.reduce<RuleConfidence>(
    (current, rule) => minConfidence(current, rule.confidence),
    hasIncompleteData ? "low" : "medium",
  );

  return {
    severity,
    flags: unique([
      ...(hasIncompleteData ? ["data_incomplete"] : []),
      ...matches.flatMap((rule) => rule.flags),
    ]),
    checklist: unique([
      ...(hasIncompleteData
        ? ["Retest missing critical parameters before trusting the result."]
        : []),
      ...matches.flatMap((rule) => rule.checklist),
    ]),
    ruleIds: matches.map((rule) => rule.id),
    confidence,
    explanations: matches.map((rule) => ({
      ruleId: rule.id,
      message: rule.message,
      why: rule.why,
      sourceId: rule.source.id,
      reviewStatus: rule.reviewStatus,
    })),
    missingFields,
  };
}
