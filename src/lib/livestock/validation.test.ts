import { describe, expect, it } from "vitest";

import { livestockFormSchema, livestockStatusFormSchema } from "./validation";

const tankId = "123e4567-e89b-12d3-a456-426614174000";
const livestockId = "123e4567-e89b-12d3-a456-426614174111";

describe("livestock validation", () => {
  it("parses bounded livestock rows", () => {
    const parsed = livestockFormSchema.parse({
      tankId,
      speciesName: "Amphiprion ocellaris",
      commonName: "Ocellaris clownfish",
      quantity: "2",
      addedAt: "2026-06-16",
      status: "active",
      notes: "Bonded pair",
    });

    expect(parsed.quantity).toBe(2);
    expect(parsed.status).toBe("active");
  });

  it("rejects unsupported status and unsafe quantity", () => {
    expect(
      livestockFormSchema.safeParse({
        tankId,
        speciesName: "Fish",
        quantity: "0",
        status: "compatible",
      }).success,
    ).toBe(false);
  });

  it("validates status updates", () => {
    expect(livestockStatusFormSchema.parse({
      tankId,
      livestockId,
      status: "quarantine",
    })).toEqual({ tankId, livestockId, status: "quarantine" });
  });
});
