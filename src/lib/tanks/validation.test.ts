import { describe, expect, it } from "vitest";

import {
  litersFromInput,
  photoExtensionFromMimeType,
  tankFormSchema,
  targetRangesForTankType,
  validateCriticalWaterTestFields,
  validateWaterTestPhoto,
  waterTestFormSchema,
  waterTestPhotoConfig,
} from "./validation";

describe("tank validation", () => {
  it("converts gallons to liters for imperial input", () => {
    expect(litersFromInput(20, "imperial")).toBe(75.71);
  });

  it("seeds reef-specific target ranges", () => {
    expect(targetRangesForTankType("reef")).toHaveProperty("salinity");
  });

  it("parses first tank onboarding data", () => {
    const parsed = tankFormSchema.parse({
      name: "Living room reef",
      type: "reef",
      volume: "120",
      unitSystem: "metric",
      startDate: "2026-06-16",
      waterSource: "RODI",
      equipmentCategory: "skimmer",
      equipmentName: "Nyos 160",
    });

    expect(parsed.volume).toBe(120);
    expect(parsed.equipmentName).toBe("Nyos 160");
  });

  it("rejects partial equipment baseline data", () => {
    const parsed = tankFormSchema.safeParse({
      name: "Living room reef",
      type: "reef",
      volume: "120",
      unitSystem: "metric",
      waterSource: "RODI",
      equipmentCategory: "skimmer",
      equipmentName: "",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("water test validation", () => {
  it("keeps blank optional values undefined", () => {
    const parsed = waterTestFormSchema.parse({
      tankId: "123e4567-e89b-12d3-a456-426614174000",
      ammonia: "0",
      nitrite: "",
      nitrate: "10",
      ph: "8.1",
      tempC: "25.5",
    });

    expect(parsed.ammonia).toBe(0);
    expect(parsed.nitrite).toBeUndefined();
  });

  it("detects missing critical reef parameters", () => {
    const parsed = waterTestFormSchema.parse({
      tankId: "123e4567-e89b-12d3-a456-426614174000",
      ammonia: "0",
      nitrite: "0",
      nitrate: "5",
      ph: "8.2",
      tempC: "25",
    });

    expect(validateCriticalWaterTestFields(parsed, "reef")).toEqual([
      "salinityPpt",
      "alkalinityDkh",
    ]);
  });

  it("accepts only supported water-test photo uploads", () => {
    expect(
      validateWaterTestPhoto(new File(["not an image"], "notes.txt", { type: "text/plain" })),
    ).toMatchObject({ error: "Photo must be JPEG, PNG, or WebP", file: null });

    expect(
      validateWaterTestPhoto(new File(["image"], "test.webp", { type: "image/webp" })),
    ).toMatchObject({ error: null });
  });

  it("rejects oversized water-test photo uploads", () => {
    const oversizedPhoto = new File(
      [new Uint8Array(waterTestPhotoConfig.maxBytes + 1)],
      "large.jpg",
      { type: "image/jpeg" },
    );

    expect(validateWaterTestPhoto(oversizedPhoto)).toMatchObject({
      error: "Photo must be 5 MB or smaller",
      file: null,
    });
  });

  it("maps supported photo mime types to stable extensions", () => {
    expect(photoExtensionFromMimeType("image/jpeg")).toBe("jpg");
    expect(photoExtensionFromMimeType("image/png")).toBe("png");
    expect(photoExtensionFromMimeType("image/webp")).toBe("webp");
  });
});
