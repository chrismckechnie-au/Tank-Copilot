import { z } from "zod";

export const livestockStatuses = ["active", "quarantine", "planned", "removed", "deceased"] as const;

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const livestockFormSchema = z.object({
  tankId: z.string().uuid(),
  speciesName: z.string().trim().min(2, "Add the species name").max(160),
  commonName: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional().default("")),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(500, "Quantity is too high for one livestock row"),
  addedAt: z.preprocess(emptyToUndefined, z.string().date().optional()),
  status: z.enum(livestockStatuses).default("active"),
  notes: z.string().trim().max(1_000).optional().default(""),
});

export const livestockStatusFormSchema = z.object({
  tankId: z.string().uuid(),
  livestockId: z.string().uuid(),
  status: z.enum(livestockStatuses),
});

export type LivestockFormInput = z.infer<typeof livestockFormSchema>;

export function formDataToLivestockObject(formData: FormData) {
  return {
    tankId: formData.get("tankId"),
    speciesName: formData.get("speciesName"),
    commonName: formData.get("commonName"),
    quantity: formData.get("quantity"),
    addedAt: formData.get("addedAt"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  };
}

export function formDataToLivestockStatusObject(formData: FormData) {
  return {
    tankId: formData.get("tankId"),
    livestockId: formData.get("livestockId"),
    status: formData.get("status"),
  };
}
