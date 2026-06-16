import { describe, expect, it } from "vitest";

import { evaluateStockingPlan } from "./planner";

describe("evaluateStockingPlan", () => {
  it("returns warning-only guidance with confidence and alternatives", () => {
    const result = evaluateStockingPlan({
      tankType: "reef",
      volumeLiters: 120,
      currentLivestockCount: 7,
      proposedSpeciesName: "Example tang",
      proposedQuantity: 2,
      adultSizeCm: 20,
      temperament: "semi_aggressive",
      waterFit: "unknown",
    });

    expect(result.status).toBe("needs_reviewer_context");
    expect(result.confidence).toBe("low");
    expect(result.warnings.join(" ")).toContain("warning-only");
    expect(result.warnings.join(" ")).not.toContain("compatible");
    expect(result.saferAlternatives.length).toBeGreaterThan(0);
  });
});
