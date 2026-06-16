import type { TankType } from "@/lib/tanks/validation";

export type StockingPlannerInput = {
  tankType: TankType;
  volumeLiters: number;
  currentLivestockCount: number;
  proposedSpeciesName: string;
  proposedQuantity: number;
  adultSizeCm: number | null;
  temperament: "peaceful" | "semi_aggressive" | "aggressive" | "unknown";
  waterFit: "good" | "unknown" | "poor";
};

export type StockingPlannerResult = {
  status: "info_only_warning" | "needs_reviewer_context";
  confidence: "low" | "medium";
  warnings: string[];
  saferAlternatives: string[];
};

export function evaluateStockingPlan(input: StockingPlannerInput): StockingPlannerResult {
  const warnings = [
    "Stocking planner v0 is warning-only and not a compatibility decision.",
  ];
  const saferAlternatives = [
    "Verify adult size, temperament, and water-parameter fit against a sourced species profile.",
    "Quarantine and observe any new livestock before adding it to the display tank.",
  ];
  const projectedCount = input.currentLivestockCount + input.proposedQuantity;

  if (input.waterFit !== "good") {
    warnings.push("Water-parameter fit is not confirmed for this tank type.");
    saferAlternatives.push("Choose species with documented fit for the tank's salinity, pH, and temperature range.");
  }

  if (input.adultSizeCm === null) {
    warnings.push("Adult size is missing, so tank-size fit cannot be estimated.");
  } else {
    const adultCmPerLiter = (input.adultSizeCm * input.proposedQuantity) / input.volumeLiters;
    if (adultCmPerLiter > 0.15) {
      warnings.push("Proposed adult size is high relative to tank volume.");
      saferAlternatives.push("Consider fewer individuals or a smaller adult-size species.");
    }
  }

  if (projectedCount > Math.max(8, input.volumeLiters / 20)) {
    warnings.push("Projected group size is high for the current tank volume.");
    saferAlternatives.push("Add livestock gradually and reassess water-test trends after each change.");
  }

  if (input.temperament === "aggressive" || input.temperament === "semi_aggressive") {
    warnings.push("Temperament may increase aggression or territory risk.");
    saferAlternatives.push("Compare temperament with current livestock and prepare a fallback housing plan.");
  }

  if (input.tankType === "reef") {
    warnings.push("Reef additions need extra caution around coral safety and stability.");
  }

  return {
    status: warnings.length > 1 ? "needs_reviewer_context" : "info_only_warning",
    confidence: input.waterFit === "good" && input.adultSizeCm !== null ? "medium" : "low",
    warnings: unique(warnings),
    saferAlternatives: unique(saferAlternatives),
  };
}

function unique(values: string[]) {
  return [...new Set(values)];
}
