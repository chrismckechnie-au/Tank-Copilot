import { describe, expect, it } from "vitest";

import {
  buildTriageFollowUpPrompts,
  observationFormSchema,
  symptomOptions,
} from "./validation";

describe("triage validation", () => {
  it("requires at least one symptom or recent-change note", () => {
    const parsed = observationFormSchema.safeParse({
      tankId: "123e4567-e89b-12d3-a456-426614174000",
      symptoms: [],
      affectedLivestock: "",
      recentChanges: "",
    });

    expect(parsed.success).toBe(false);
  });

  it("parses structured symptom intake", () => {
    const parsed = observationFormSchema.parse({
      tankId: "123e4567-e89b-12d3-a456-426614174000",
      symptoms: ["gasping", "spots_or_lesions"],
      affectedLivestock: "Two clownfish",
      recentChanges: "Added new coral yesterday",
    });

    expect(parsed.symptoms).toEqual(["gasping", "spots_or_lesions"]);
    expect(parsed.affectedLivestock).toBe("Two clownfish");
  });

  it("limits symptoms to known options", () => {
    expect(symptomOptions).toContain("gasping");
    expect(
      observationFormSchema.safeParse({
        tankId: "123e4567-e89b-12d3-a456-426614174000",
        symptoms: ["not-a-real-symptom"],
      }).success,
    ).toBe(false);
  });

  it("builds safe follow-up prompts without diagnosis or dosing language", () => {
    const prompts = buildTriageFollowUpPrompts({
      tankId: "123e4567-e89b-12d3-a456-426614174000",
      symptoms: ["gasping", "lethargy"],
      affectedLivestock: "Guppies",
      recentChanges: "",
    });

    expect(prompts.join(" ")).toMatch(/latest water test/i);
    expect(prompts.join(" ").toLowerCase()).not.toMatch(/diagnos|dose|treat with/);
  });
});
