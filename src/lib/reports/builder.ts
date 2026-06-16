import type { Json } from "@/lib/supabase/database.types";
import type { TankType } from "@/lib/tanks/validation";
import { knownSymptomStrings } from "@/lib/triage/symptoms";

type RuleSeverity = "green" | "yellow" | "red";
type RuleConfidence = "low" | "medium" | "high";
type RuleReviewStatus = "unsigned" | "signed";

type ReportTank = {
  id: string;
  name: string;
  type: TankType;
  volume_liters: number;
};

type ReportWaterTest = {
  id: string;
  tested_at: string;
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

type ReportExplanation = {
  ruleId: string;
  message: string;
  why: string;
  sourceId: string;
  reviewStatus: RuleReviewStatus;
};

type ReportRecommendation = {
  severity: RuleSeverity;
  rule_version: string;
  explanation: string;
  explanations: ReportExplanation[];
  checklist: string[];
  confidence: RuleConfidence;
  review_status: RuleReviewStatus;
  display_mode: "info_only" | "actionable";
  missing_fields: string[];
};

type ReportObservation = {
  id: string;
  symptoms: unknown;
  affected_livestock: string;
  recent_changes: string;
  photo_paths: string[];
  follow_up_prompts: unknown;
};

export type PublicReportV1 = {
  version: "PublicReportV1";
  reportType: "community";
  title: string;
  generatedAt: string;
  tank: {
    type: TankType;
    volumeLiters: number;
  };
  ruleVersion: string;
  severity: RuleSeverity;
  confidence: RuleConfidence;
  reviewStatus: RuleReviewStatus;
  displayMode: "info_only" | "actionable";
  rulesUnderReview: boolean;
  generatedWithAi: boolean;
  summary: string;
  explanations: ReportExplanation[];
  checklist: string[];
  openQuestions: string[];
  observationSummary: {
    count: number;
    symptoms: string[];
  };
  genericNextSteps: string[];
  watermark: "Powered by Tank Copilot";
};

export type FullReportV1 = {
  version: "FullReportV1";
  generatedAt: string;
  tank: {
    id: string;
    name: string;
    type: TankType;
    volumeLiters: number;
  };
  latestWaterTest: {
    id: string;
    testedAt: string;
    parameters: Record<string, number | null>;
  };
  recommendation: ReportRecommendation;
  observations: Array<{
    id: string;
    symptoms: string[];
    affectedLivestock: string;
    recentChanges: string;
    photoPaths: string[];
    followUpPrompts: string[];
  }>;
  publicProjection: PublicReportV1;
};

export type ReportContent = {
  full: FullReportV1;
  public: PublicReportV1;
};

export function buildReportContent(input: {
  generatedAt: string;
  tank: ReportTank;
  latestWaterTest: ReportWaterTest;
  recommendation: ReportRecommendation;
  observations: ReportObservation[];
}): ReportContent {
  const observations = input.observations.map((observation) => ({
    id: observation.id,
    symptoms: knownSymptomStrings(observation.symptoms),
    affectedLivestock: observation.affected_livestock,
    recentChanges: observation.recent_changes,
    photoPaths: observation.photo_paths,
    followUpPrompts: stringArray(observation.follow_up_prompts),
  }));
  const signed = input.recommendation.review_status === "signed";
  const publicReport: PublicReportV1 = {
    version: "PublicReportV1",
    reportType: "community",
    title: `${tankTypeLabel(input.tank.type)} aquarium context report`,
    generatedAt: input.generatedAt,
    tank: {
      type: input.tank.type,
      volumeLiters: Math.round(input.tank.volume_liters),
    },
    ruleVersion: input.recommendation.rule_version,
    severity: input.recommendation.severity,
    confidence: input.recommendation.confidence,
    reviewStatus: input.recommendation.review_status,
    displayMode: input.recommendation.display_mode,
    rulesUnderReview: !signed,
    generatedWithAi: false,
    summary: publicSummary(input.recommendation),
    explanations: signed
      ? input.recommendation.explanations.filter(
          (explanation) => explanation.reviewStatus === "signed",
        )
      : [],
    checklist: signed ? input.recommendation.checklist : [],
    openQuestions: uniqueStrings([
      ...input.recommendation.missing_fields.map(
        (field) => `Confirm or add ${field} before relying on this report.`,
      ),
      ...observations.flatMap((observation) => observation.followUpPrompts),
    ]),
    observationSummary: {
      count: observations.length,
      symptoms: uniqueStrings(observations.flatMap((observation) => observation.symptoms)),
    },
    genericNextSteps: [
      "Confirm the latest water-test values before interpreting this report.",
      "Share this context with an aquatic vet, LFS specialist, or experienced aquarium reviewer.",
    ],
    watermark: "Powered by Tank Copilot",
  };

  return {
    full: {
      version: "FullReportV1",
      generatedAt: input.generatedAt,
      tank: {
        id: input.tank.id,
        name: input.tank.name,
        type: input.tank.type,
        volumeLiters: input.tank.volume_liters,
      },
      latestWaterTest: {
        id: input.latestWaterTest.id,
        testedAt: input.latestWaterTest.tested_at,
        parameters: {
          ammonia: input.latestWaterTest.ammonia,
          nitrite: input.latestWaterTest.nitrite,
          nitrate: input.latestWaterTest.nitrate,
          ph: input.latestWaterTest.ph,
          tempC: input.latestWaterTest.temp_c,
          salinity: input.latestWaterTest.salinity,
          alkalinity: input.latestWaterTest.kh,
          gh: input.latestWaterTest.gh,
          phosphate: input.latestWaterTest.phosphate,
          calcium: input.latestWaterTest.calcium,
          magnesium: input.latestWaterTest.magnesium,
        },
      },
      recommendation: input.recommendation,
      observations,
      publicProjection: publicReport,
    },
    public: publicReport,
  };
}

export function reportJson(value: ReportContent["full"] | ReportContent["public"]): Json {
  return value as unknown as Json;
}

function publicSummary(recommendation: ReportRecommendation) {
  if (recommendation.review_status === "signed") {
    return recommendation.explanation;
  }

  return "Rules are under expert review. This shared report is an info-only context summary, not aquarium-care advice.";
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function tankTypeLabel(type: TankType) {
  switch (type) {
    case "fw":
      return "Freshwater";
    case "planted":
      return "Planted";
    case "reef":
      return "Reef";
  }
}
