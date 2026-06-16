import { z } from "zod";

export const symptomOptions = [
  "gasping",
  "lethargy",
  "not_eating",
  "spots_or_lesions",
  "clamped_fins",
  "flashing_or_scratching",
  "rapid_breathing",
  "coral_retracted",
  "algae_bloom",
  "cloudy_water",
] as const;

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

const symptomsFromForm = (value: unknown) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    return [value];
  }

  return [];
};

export const observationFormSchema = z
  .object({
    tankId: z.string().uuid(),
    symptoms: z.preprocess(symptomsFromForm, z.array(z.enum(symptomOptions)).default([])),
    affectedLivestock: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(300).optional().default(""),
    ),
    recentChanges: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(1_000).optional().default(""),
    ),
  })
  .superRefine((input, context) => {
    if (input.symptoms.length > 0 || input.recentChanges.length > 0) {
      return;
    }

    context.addIssue({
      code: "custom",
      message: "Select at least one symptom or describe a recent change",
      path: ["symptoms"],
    });
  });

export type ObservationFormInput = z.infer<typeof observationFormSchema>;

export function buildTriageFollowUpPrompts(input: ObservationFormInput) {
  const prompts = [
    "Add or confirm the latest water test before interpreting this observation.",
    "Note recent changes in livestock, feeding, equipment, water source, or maintenance.",
  ];

  if (input.symptoms.some((symptom) => symptom === "gasping" || symptom === "rapid_breathing")) {
    prompts.push("Record temperature, surface agitation, and whether livestock are gathering near flow or the surface.");
  }

  if (input.symptoms.some((symptom) => symptom === "spots_or_lesions" || symptom === "clamped_fins")) {
    prompts.push("Add clear photos and note which livestock are affected so a reviewer can compare visible signs.");
  }

  if (input.symptoms.includes("coral_retracted")) {
    prompts.push("Confirm salinity, alkalinity, phosphate, calcium, and magnesium before reef interpretation.");
  }

  return prompts;
}

export function formDataToObservationObject(formData: FormData) {
  return {
    tankId: formData.get("tankId"),
    symptoms: formData.getAll("symptoms"),
    affectedLivestock: formData.get("affectedLivestock"),
    recentChanges: formData.get("recentChanges"),
  };
}
