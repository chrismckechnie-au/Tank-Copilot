import { z } from "zod";

export const tankTypes = ["fw", "planted", "reef"] as const;
export const unitSystems = ["metric", "imperial"] as const;
export const equipmentCategories = [
  "heater",
  "filter",
  "light",
  "skimmer",
  "media",
  "pump",
  "other",
] as const;

export type TankType = (typeof tankTypes)[number];

export const waterTestPhotoConfig = {
  bucket: "tank-photos",
  maxBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

const optionalNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().finite().nonnegative().optional(),
);

export const tankFormSchema = z
  .object({
    name: z.string().trim().min(2, "Name your tank").max(80),
    type: z.enum(tankTypes),
    volume: z.coerce.number().finite().positive("Volume must be greater than 0").max(100_000),
    unitSystem: z.enum(unitSystems),
    startDate: z.preprocess(emptyToUndefined, z.string().date().optional()),
    waterSource: z.string().trim().min(2, "Add the water source").max(80),
    equipmentCategory: z.preprocess(emptyToUndefined, z.enum(equipmentCategories).optional()),
    equipmentName: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(80).optional()),
  })
  .superRefine((input, context) => {
    if (Boolean(input.equipmentCategory) === Boolean(input.equipmentName)) {
      return;
    }

    context.addIssue({
      code: "custom",
      message: "Add both equipment category and equipment name, or leave both blank",
      path: ["equipmentName"],
    });
  });

export const waterTestFormSchema = z.object({
  tankId: z.string().uuid(),
  ammonia: optionalNumber,
  nitrite: optionalNumber,
  nitrate: optionalNumber,
  ph: optionalNumber.refine((value) => value === undefined || value <= 14, "pH must be 0-14"),
  tempC: optionalNumber.refine(
    (value) => value === undefined || value <= 45,
    "Temperature must be plausible",
  ),
  salinityPpt: optionalNumber,
  alkalinityDkh: optionalNumber,
  gh: optionalNumber,
  phosphate: optionalNumber,
  calcium: optionalNumber,
  magnesium: optionalNumber,
  notes: z.string().trim().max(1_000).optional().default(""),
});

export type TankFormInput = z.infer<typeof tankFormSchema>;
export type WaterTestFormInput = z.infer<typeof waterTestFormSchema>;

export function litersFromInput(volume: number, unitSystem: TankFormInput["unitSystem"]) {
  return unitSystem === "imperial" ? Number((volume * 3.78541).toFixed(2)) : volume;
}

export function targetRangesForTankType(type: TankType) {
  const base = {
    ammonia: { ideal: 0, unit: "ppm" },
    nitrite: { ideal: 0, unit: "ppm" },
    nitrate: { caution: type === "reef" ? 10 : 40, unit: "ppm" },
    ph: { note: "Species and system dependent" },
    temp_c: { note: "Species dependent" },
  };

  if (type !== "reef") {
    return base;
  }

  return {
    ...base,
    salinity: { note: "Reef stability required" },
    kh: { note: "Avoid rapid alkalinity swings" },
    calcium: { note: "Reef-specific tracking" },
    magnesium: { note: "Reef-specific tracking" },
    phosphate: { note: "Reef-specific tracking" },
  };
}

export function requiredWaterTestFieldsForTankType(type: TankType) {
  const core = ["ammonia", "nitrite", "nitrate", "ph", "tempC"] as const;

  if (type === "reef") {
    return [...core, "salinityPpt", "alkalinityDkh"] as const;
  }

  return core;
}

export function validateCriticalWaterTestFields(
  input: WaterTestFormInput,
  tankType: TankType,
): string[] {
  return requiredWaterTestFieldsForTankType(tankType).filter(
    (field) => input[field] === undefined,
  );
}

export function validateWaterTestPhoto(entry: FormDataEntryValue | null): {
  error: string | null;
  file: File | null;
} {
  if (entry === null) {
    return { error: null, file: null };
  }

  if (!(entry instanceof File)) {
    return { error: "Photo upload was invalid", file: null };
  }

  if (entry.size === 0) {
    return { error: null, file: null };
  }

  if (!waterTestPhotoConfig.allowedMimeTypes.some((mimeType) => mimeType === entry.type)) {
    return { error: "Photo must be JPEG, PNG, or WebP", file: null };
  }

  if (entry.size > waterTestPhotoConfig.maxBytes) {
    return { error: "Photo must be 5 MB or smaller", file: null };
  }

  return { error: null, file: entry };
}

export function photoExtensionFromMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
