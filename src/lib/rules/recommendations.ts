import {
  evaluateWaterTest,
  rulesV0Version,
  type RuleConfidence,
  type RuleEngineResult,
  type RuleExplanation,
  type RuleReviewStatus,
  type RuleSeverity,
} from "./index";
import type { TankType } from "@/lib/tanks/validation";

type PersistedTankForRules = {
  id: string;
  type: TankType;
  volume_liters: number;
};

type PersistedWaterTestForRules = {
  id: string;
  ammonia: number | null;
  nitrite: number | null;
  nitrate: number | null;
  ph: number | null;
  temp_c: number | null;
  salinity: number | null;
  kh: number | null;
  gh: number | null;
  phosphate: number | null;
  calcium: number | null;
  magnesium: number | null;
};

export type RecommendationDraft = {
  tankId: string;
  waterTestId: string;
  severity: RuleSeverity;
  flags: string[];
  ruleIds: string[];
  ruleVersion: string;
  explanation: string;
  explanations: RuleEngineResult["explanations"];
  checklist: string[];
  confidence: RuleConfidence;
  reviewStatus: RuleReviewStatus;
  displayMode: "info_only" | "actionable";
  missingFields: string[];
};

export type RecommendationRecordForDisplay = {
  tank_id: string;
  water_test_id: string;
  severity: RuleSeverity;
  flags: string[] | null;
  rule_ids: string[] | null;
  rule_version: string;
  explanation: string;
  explanations: unknown;
  checklist: unknown;
  confidence: RuleConfidence;
  review_status: RuleReviewStatus;
  display_mode: "info_only" | "actionable";
  missing_fields: string[] | null;
};

export function buildRecommendationDraft({
  tank,
  waterTest,
}: {
  tank: PersistedTankForRules;
  waterTest: PersistedWaterTestForRules;
}): RecommendationDraft {
  const result = evaluateWaterTest({
    tank: {
      type: tank.type,
      volumeLiters: tank.volume_liters,
    },
    waterTest: {
      ammonia: waterTest.ammonia,
      nitrite: waterTest.nitrite,
      nitrate: waterTest.nitrate,
      ph: waterTest.ph,
      tempC: waterTest.temp_c,
      salinityPpt: waterTest.salinity,
      alkalinityDkh: waterTest.kh,
      gh: waterTest.gh,
      phosphate: waterTest.phosphate,
      calcium: waterTest.calcium,
      magnesium: waterTest.magnesium,
    },
  });

  return {
    tankId: tank.id,
    waterTestId: waterTest.id,
    severity: result.severity,
    flags: result.flags,
    ruleIds: result.ruleIds,
    ruleVersion: rulesV0Version,
    explanation: explanationSummary(result),
    explanations: result.explanations,
    checklist: result.checklist,
    confidence: result.confidence,
    reviewStatus: "unsigned",
    displayMode: "info_only",
    missingFields: result.missingFields,
  };
}

export function recommendationDisplayChecklist(draft: RecommendationDraft) {
  return draft.reviewStatus === "signed" ? draft.checklist : [];
}

export function recommendationPersistedChecklist(draft: RecommendationDraft) {
  return draft.reviewStatus === "signed" ? draft.checklist : [];
}

export function recommendationDraftFromRecord(
  record: RecommendationRecordForDisplay,
): RecommendationDraft {
  return {
    tankId: record.tank_id,
    waterTestId: record.water_test_id,
    severity: record.severity,
    flags: record.flags ?? [],
    ruleIds: record.rule_ids ?? [],
    ruleVersion: record.rule_version,
    explanation: record.explanation,
    explanations: parseExplanations(record.explanations),
    checklist: parseStringArray(record.checklist),
    confidence: record.confidence,
    reviewStatus: record.review_status,
    displayMode: record.display_mode,
    missingFields: record.missing_fields ?? [],
  };
}

function explanationSummary(result: RuleEngineResult) {
  if (result.missingFields.length > 0) {
    return "Internal QA result: critical data is incomplete, so Tank Copilot cannot score the tank as clear.";
  }

  if (result.ruleIds.length === 0) {
    return "Internal QA result: no implemented unsigned rule matched this test.";
  }

  return `Internal QA result: ${result.ruleIds.length} unsigned rule ${result.ruleIds.length === 1 ? "matched" : "matched"}.`;
}

function parseStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseExplanations(value: unknown): RuleExplanation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is RuleExplanation => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const candidate = item as Record<string, unknown>;
    return (
      typeof candidate.ruleId === "string" &&
      typeof candidate.message === "string" &&
      typeof candidate.why === "string" &&
      typeof candidate.sourceId === "string" &&
      (candidate.reviewStatus === "unsigned" || candidate.reviewStatus === "signed")
    );
  });
}
