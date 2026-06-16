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

export type SymptomOption = (typeof symptomOptions)[number];

const symptomOptionSet = new Set<string>(symptomOptions);

export function knownSymptomStrings(value: unknown): SymptomOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is SymptomOption => (
    typeof item === "string" && symptomOptionSet.has(item)
  ));
}
