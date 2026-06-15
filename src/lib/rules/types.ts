import type { TankType } from "@/lib/tanks/validation";

export type RuleSeverity = "green" | "yellow" | "red";
export type RuleConfidence = "low" | "medium" | "high";
export type RuleReviewStatus = "unsigned" | "signed";

export type RuleWaterTest = {
  ammonia?: number | null;
  nitrite?: number | null;
  nitrate?: number | null;
  ph?: number | null;
  tempC?: number | null;
  salinityPpt?: number | null;
  alkalinityDkh?: number | null;
  gh?: number | null;
  phosphate?: number | null;
  calcium?: number | null;
  magnesium?: number | null;
};

export type RuleEngineInput = {
  tank: {
    type: TankType;
    volumeLiters: number;
  };
  waterTest: RuleWaterTest;
};

export type RuleSource = {
  id: string;
  title: string;
  url: string;
};

export type RuleDefinition = {
  id: string;
  param: keyof RuleWaterTest | "tank_type";
  condition: string;
  tankTypes: TankType[];
  severity: Exclude<RuleSeverity, "green">;
  message: string;
  why: string;
  source: RuleSource;
  confidence: RuleConfidence;
  reviewStatus: RuleReviewStatus;
  flags: string[];
  checklist: string[];
  matches: (input: RuleEngineInput) => boolean;
};

export type RuleExplanation = {
  ruleId: string;
  message: string;
  why: string;
  sourceId: string;
  reviewStatus: RuleReviewStatus;
};

export type RuleEngineResult = {
  severity: RuleSeverity;
  flags: string[];
  checklist: string[];
  ruleIds: string[];
  confidence: RuleConfidence;
  explanations: RuleExplanation[];
  missingFields: string[];
};
