import { describe, expect, it } from "vitest";

import { buildReportContent } from "./builder";

const baseInput = {
  generatedAt: "2026-06-16T01:00:00.000Z",
  tank: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Chris home reef",
    type: "reef" as const,
    volume_liters: 432.4,
  },
  latestWaterTest: {
    id: "123e4567-e89b-12d3-a456-426614174111",
    tested_at: "2026-06-16T00:30:00.000Z",
    ammonia: 0,
    nitrite: 0,
    nitrate: 5,
    ph: 8.1,
    temp_c: 25.4,
    salinity: 35,
    kh: 8.2,
    gh: null,
    phosphate: 0.04,
    calcium: 430,
    magnesium: 1350,
  },
  recommendation: {
    severity: "yellow" as const,
    rule_version: "rules-v0",
    explanation: "Internal QA result: 1 unsigned rule matched.",
    explanations: [
      {
        ruleId: "REEF-NITRATE-001",
        message: "Nitrate is above the conservative reef reference range.",
        why: "Higher nutrients can stress sensitive coral.",
        sourceId: "SRC-REEF",
        reviewStatus: "unsigned" as const,
      },
    ],
    checklist: ["Do a large rapid water change"],
    confidence: "medium" as const,
    review_status: "unsigned" as const,
    display_mode: "info_only" as const,
    missing_fields: ["phosphate"],
  },
  observations: [
    {
      id: "123e4567-e89b-12d3-a456-426614174222",
      symptoms: ["coral_retracted", "gasping"],
      affected_livestock: "Acan colony near the front window",
      recent_changes: "Moved house from 12 Sample Street and changed salt brand.",
      photo_paths: [
        "123e4567-e89b-12d3-a456-426614174999/123e4567-e89b-12d3-a456-426614174000/observations/private.jpg",
      ],
      follow_up_prompts: [
        "Confirm salinity, alkalinity, phosphate, calcium, and magnesium before reef interpretation.",
      ],
    },
  ],
};

describe("buildReportContent", () => {
  it("redacts private identifiers, free text, and photo paths from PublicReportV1", () => {
    const report = buildReportContent(baseInput);
    const publicJson = JSON.stringify(report.public);

    expect(report.public.version).toBe("PublicReportV1");
    expect(publicJson).not.toContain(baseInput.tank.id);
    expect(publicJson).not.toContain(baseInput.latestWaterTest.id);
    expect(publicJson).not.toContain(baseInput.tank.name);
    expect(publicJson).not.toContain("Sample Street");
    expect(publicJson).not.toContain("private.jpg");
  });

  it("keeps unsigned advice out of public report content", () => {
    const report = buildReportContent(baseInput);

    expect(report.public.rulesUnderReview).toBe(true);
    expect(report.public.explanations).toEqual([]);
    expect(report.public.checklist).toEqual([]);
    expect(JSON.stringify(report.public)).not.toContain("large rapid water change");
  });

  it("includes signed explanations and checklist only after reviewer sign-off", () => {
    const report = buildReportContent({
      ...baseInput,
      recommendation: {
        ...baseInput.recommendation,
        explanations: [
          {
            ...baseInput.recommendation.explanations[0],
            reviewStatus: "signed",
          },
        ],
        checklist: ["Share this report with your aquarium reviewer."],
        review_status: "signed",
        display_mode: "actionable",
      },
    });

    expect(report.public.rulesUnderReview).toBe(false);
    expect(report.public.explanations).toHaveLength(1);
    expect(report.public.checklist).toEqual([
      "Share this report with your aquarium reviewer.",
    ]);
  });
});
