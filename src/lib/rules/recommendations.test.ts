import { describe, expect, it } from "vitest";

import {
  buildRecommendationDraft,
  recommendationDraftFromRecord,
  recommendationDisplayChecklist,
  recommendationPersistedChecklist,
} from "./recommendations";

describe("recommendation persistence draft", () => {
  it("maps persisted water-test rows into canonical rules input", () => {
    const draft = buildRecommendationDraft({
      tank: {
        id: "tank-1",
        type: "reef",
        volume_liters: 240,
      },
      waterTest: {
        id: "test-1",
        ammonia: 0,
        nitrite: 0,
        nitrate: 5,
        ph: 8.2,
        temp_c: 26,
        salinity: 35,
        kh: 8.4,
        gh: null,
        phosphate: 0.2,
        calcium: 500,
        magnesium: 1220,
      },
    });

    expect(draft.ruleVersion).toMatch(/^rules\.v0/);
    expect(draft.ruleIds).toContain("RULE-0012-reef-magnesium-drift");
    expect(draft.reviewStatus).toBe("unsigned");
    expect(draft.displayMode).toBe("info_only");
  });

  it("hides action checklists until the rules version is signed", () => {
    const draft = buildRecommendationDraft({
      tank: {
        id: "tank-1",
        type: "fw",
        volume_liters: 120,
      },
      waterTest: {
        id: "test-1",
        ammonia: 0.25,
        nitrite: 0,
        nitrate: 10,
        ph: 7.2,
        temp_c: 25,
        salinity: null,
        kh: null,
        gh: null,
        phosphate: null,
        calcium: null,
        magnesium: null,
      },
    });

    expect(draft.severity).toBe("red");
    expect(draft.checklist.length).toBeGreaterThan(0);
    expect(recommendationDisplayChecklist(draft)).toEqual([]);
    expect(recommendationPersistedChecklist(draft)).toEqual([]);
  });

  it("hydrates persisted recommendation content instead of forcing recomputation", () => {
    const draft = recommendationDraftFromRecord({
      tank_id: "tank-1",
      water_test_id: "test-1",
      severity: "yellow",
      flags: ["persisted_flag"],
      rule_ids: ["RULE-PERSISTED"],
      rule_version: "rules.v0.persisted",
      explanation: "Persisted explanation",
      explanations: [
        {
          ruleId: "RULE-PERSISTED",
          message: "Persisted message",
          why: "Persisted why",
          sourceId: "SRC-001",
          reviewStatus: "unsigned",
        },
      ],
      checklist: [],
      confidence: "low",
      review_status: "unsigned",
      display_mode: "info_only",
      missing_fields: ["nitrite"],
    });

    expect(draft.ruleVersion).toBe("rules.v0.persisted");
    expect(draft.ruleIds).toEqual(["RULE-PERSISTED"]);
    expect(draft.explanation).toBe("Persisted explanation");
    expect(draft.missingFields).toEqual(["nitrite"]);
  });
});
