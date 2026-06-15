import { describe, expect, it } from "vitest";

import {
  evaluateWaterTest,
  fahrenheitToCelsius,
  rulesV0,
  type RuleEngineInput,
} from "./index";

const baseInput: RuleEngineInput = {
  tank: {
    type: "fw",
    volumeLiters: 120,
  },
  waterTest: {
    ammonia: 0,
    nitrite: 0,
    nitrate: 10,
    ph: 7.2,
    tempC: 25,
  },
};

describe("rules v0 config", () => {
  it("keeps every rule traceable and unsigned", () => {
    expect(rulesV0.length).toBeGreaterThan(0);
    expect(
      rulesV0.every(
        (rule) =>
          rule.id &&
          rule.param &&
          rule.condition &&
          rule.source.id.startsWith("SRC-") &&
          rule.reviewStatus === "unsigned",
      ),
    ).toBe(true);
  });
});

describe("rules engine", () => {
  it("returns green only when critical data is present and no rule flags", () => {
    expect(evaluateWaterTest(baseInput)).toMatchObject({
      severity: "yellow",
      flags: [],
      ruleIds: ["RULE-0009-temperature-unscored"],
    });
  });

  it("returns yellow incomplete instead of false all-clear when critical data is missing", () => {
    const result = evaluateWaterTest({
      ...baseInput,
      waterTest: {
        ...baseInput.waterTest,
        nitrite: null,
      },
    });

    expect(result.severity).toBe("yellow");
    expect(result.flags).toContain("data_incomplete");
    expect(result.checklist).toContain("Retest missing critical parameters before trusting the result.");
  });

  it("treats any detectable ammonia or nitrite as urgent", () => {
    const result = evaluateWaterTest({
      ...baseInput,
      waterTest: {
        ...baseInput.waterTest,
        ammonia: 0.25,
        nitrite: 0.5,
      },
    });

    expect(result.severity).toBe("red");
    expect(result.ruleIds).toEqual(
      expect.arrayContaining(["RULE-0001-ammonia-detectable", "RULE-0002-nitrite-detectable"]),
    );
    expect(result.checklist.join(" ")).toMatch(/experienced LFS\/operator/i);
  });

  it("flags reef tests missing reef-critical salinity and alkalinity", () => {
    const result = evaluateWaterTest({
      tank: {
        type: "reef",
        volumeLiters: 240,
      },
      waterTest: {
        ammonia: 0,
        nitrite: 0,
        nitrate: 5,
        ph: 8.2,
        tempC: 26,
      },
    });

    expect(result.severity).toBe("yellow");
    expect(result.missingFields).toEqual(["salinityPpt", "alkalinityDkh"]);
  });

  it("flags tank-type parameter contradictions", () => {
    const result = evaluateWaterTest({
      ...baseInput,
      waterTest: {
        ...baseInput.waterTest,
        salinityPpt: 35,
        alkalinityDkh: 9,
      },
    });

    expect(result.severity).toBe("yellow");
    expect(result.flags).toContain("tank_type_mismatch");
    expect(result.ruleIds).toContain("RULE-0008-freshwater-reef-parameters");
  });

  it("uses tank-specific nitrate thresholds", () => {
    const freshwaterResult = evaluateWaterTest({
      ...baseInput,
      waterTest: {
        ...baseInput.waterTest,
        nitrate: 30,
      },
    });
    const reefResult = evaluateWaterTest({
      tank: {
        type: "reef",
        volumeLiters: 240,
      },
      waterTest: {
        ammonia: 0,
        nitrite: 0,
        nitrate: 60,
        ph: 8.2,
        tempC: 26,
        salinityPpt: 35,
        alkalinityDkh: 9,
      },
    });

    expect(freshwaterResult.severity).toBe("yellow");
    expect(reefResult.severity).toBe("yellow");
    expect(reefResult.ruleIds).toContain("RULE-0006-reef-nitrate-drift");
  });

  it("does not use imperative rapid-correction language", () => {
    const result = evaluateWaterTest({
      ...baseInput,
      waterTest: {
        ...baseInput.waterTest,
        ph: 5.9,
      },
    });

    expect(result.severity).toBe("yellow");
    expect(result.checklist.join(" ").toLowerCase()).not.toMatch(/dose|immediately correct|rapid/);
  });

  it("converts fahrenheit to celsius for canonical temperature comparisons", () => {
    expect(fahrenheitToCelsius(77)).toBe(25);
  });

  it("treats non-finite critical numbers as incomplete data", () => {
    const result = evaluateWaterTest({
      ...baseInput,
      waterTest: {
        ammonia: Number.NaN,
        nitrite: Number.POSITIVE_INFINITY,
        nitrate: 10,
        ph: 7.2,
        tempC: 25,
      },
    });

    expect(result.severity).toBe("yellow");
    expect(result.flags).toContain("data_incomplete");
    expect(result.missingFields).toEqual(["ammonia", "nitrite"]);
  });

  it("uses canonical reef salinity and alkalinity units", () => {
    const normalResult = evaluateWaterTest({
      tank: {
        type: "reef",
        volumeLiters: 240,
      },
      waterTest: {
        ammonia: 0,
        nitrite: 0,
        nitrate: 5,
        ph: 8.2,
        tempC: 26,
        salinityPpt: 35,
        alkalinityDkh: 8.4,
      },
    });
    const outOfRangeResult = evaluateWaterTest({
      tank: {
        type: "reef",
        volumeLiters: 240,
      },
      waterTest: {
        ammonia: 0,
        nitrite: 0,
        nitrate: 5,
        ph: 8.2,
        tempC: 26,
        salinityPpt: 31,
        alkalinityDkh: 5,
      },
    });

    expect(normalResult.ruleIds).not.toContain("RULE-0007-reef-salinity-drift");
    expect(normalResult.ruleIds).not.toContain("RULE-0010-reef-alkalinity-drift");
    expect(outOfRangeResult.ruleIds).toEqual(
      expect.arrayContaining(["RULE-0007-reef-salinity-drift", "RULE-0010-reef-alkalinity-drift"]),
    );
  });

  it("keeps reef parameter thresholds source-specific", () => {
    const result = evaluateWaterTest({
      tank: {
        type: "reef",
        volumeLiters: 240,
      },
      waterTest: {
        ammonia: 0,
        nitrite: 0,
        nitrate: 5,
        ph: 8.2,
        tempC: 26,
        salinityPpt: 35,
        alkalinityDkh: 8.4,
        calcium: 500,
        magnesium: 1220,
        phosphate: 0.2,
      },
    });

    expect(result.ruleIds).toContain("RULE-0012-reef-magnesium-drift");
    expect(result.ruleIds).not.toContain("RULE-0011-reef-calcium-drift");
    expect(result.ruleIds).not.toContain("RULE-0013-reef-phosphate-drift");
    expect(
      result.explanations.find((explanation) => explanation.ruleId === "RULE-0012-reef-magnesium-drift")?.sourceId,
    ).toBe("SRC-004");
  });
});
