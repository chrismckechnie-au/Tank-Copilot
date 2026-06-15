import type { RuleDefinition, RuleEngineInput, RuleSource } from "./types";

const appliesToAllTanks = ["fw", "planted", "reef"] as const;

const sources = {
  merckRanges: {
    id: "SRC-001",
    title: "Normal Reference Ranges for Routine Water Quality Analysis",
    url: "https://www.msdvetmanual.com/multimedia/table/normal-reference-ranges-for-routine-water-quality-analysis",
  },
  merckEnvironmental: {
    id: "SRC-002",
    title: "Environmental Diseases of Aquatic Animals in Aquatic Systems",
    url: "https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems",
  },
  reefVet: {
    id: "SRC-003",
    title: "Water Quality for Reef Aquariums",
    url: "https://azeah.com/marine-tropical/water-quality-reef-aquariums",
  },
  reefChemistry: {
    id: "SRC-004",
    title: "Optimal Parameters for a Coral Reef Aquarium",
    url: "https://www.reef2reef.com/ams/optimal-parameters-for-a-coral-reef-aquarium-by-randy-holmes-farley.79/",
  },
} satisfies Record<string, RuleSource>;

function valuePresent(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function outsideRange(value: number | null | undefined, min: number, max: number) {
  return valuePresent(value) && (value < min || value > max);
}

function hasFreshwaterReefParameter(input: RuleEngineInput) {
  if (input.tank.type === "reef") {
    return false;
  }

  const { alkalinityDkh, calcium, magnesium, phosphate, salinityPpt } = input.waterTest;
  return [alkalinityDkh, calcium, magnesium, phosphate, salinityPpt].some(valuePresent);
}

export const rulesV0: RuleDefinition[] = [
  {
    id: "RULE-0001-ammonia-detectable",
    param: "ammonia",
    condition: "ammonia > 0 ppm",
    tankTypes: [...appliesToAllTanks],
    severity: "red",
    message: "Ammonia is detectable.",
    why: "Reference ranges list total ammonia and toxic un-ionized ammonia as 0 mg/L; toxicity rises with pH and temperature.",
    source: sources.merckEnvironmental,
    confidence: "medium",
    reviewStatus: "unsigned",
    flags: ["ammonia_detectable"],
    checklist: [
      "Check aeration and confirm filtration is running.",
      "Retest ammonia and nitrite, and contact an aquatic vet or experienced LFS/operator if livestock are distressed.",
    ],
    matches: (input) => valuePresent(input.waterTest.ammonia) && input.waterTest.ammonia > 0,
  },
  {
    id: "RULE-0002-nitrite-detectable",
    param: "nitrite",
    condition: "nitrite > 0 ppm",
    tankTypes: [...appliesToAllTanks],
    severity: "red",
    message: "Nitrite is detectable.",
    why: "Reference ranges list nitrite as 0 mg/L; nitrite can interfere with oxygen transport in fish.",
    source: sources.merckRanges,
    confidence: "medium",
    reviewStatus: "unsigned",
    flags: ["nitrite_detectable"],
    checklist: [
      "Check fish breathing and surface-gasping symptoms.",
      "Retest nitrite, and contact an aquatic vet or experienced LFS/operator if livestock are distressed.",
    ],
    matches: (input) => valuePresent(input.waterTest.nitrite) && input.waterTest.nitrite > 0,
  },
  {
    id: "RULE-0003-freshwater-nitrate-drift",
    param: "nitrate",
    condition: "freshwater/planted nitrate >= 20 ppm",
    tankTypes: ["fw", "planted"],
    severity: "yellow",
    message: "Nitrate is above the freshwater reference range.",
    why: "Freshwater references list nitrate below 20 mg/L; nitrate kit unit conventions need reviewer confirmation before advice ships.",
    source: sources.merckRanges,
    confidence: "low",
    reviewStatus: "unsigned",
    flags: ["nitrate_drift"],
    checklist: [
      "Confirm the result with a fresh test.",
      "Review recent feeding, stocking, filter maintenance, and source-water nitrate.",
    ],
    matches: (input) =>
      input.tank.type !== "reef" &&
      valuePresent(input.waterTest.nitrate) &&
      input.waterTest.nitrate >= 20,
  },
  {
    id: "RULE-0004-freshwater-ph-out-of-range",
    param: "ph",
    condition: "freshwater/planted pH < 6.5 or > 9.0",
    tankTypes: ["fw", "planted"],
    severity: "yellow",
    message: "pH is outside the broad freshwater reference range.",
    why: "Freshwater pH reference ranges are broad, but stability and source-water comparison matter.",
    source: sources.merckRanges,
    confidence: "low",
    reviewStatus: "unsigned",
    flags: ["ph_out_of_range"],
    checklist: [
      "Compare tank pH with source water.",
      "Check KH/alkalinity before making any large pH change.",
    ],
    matches: (input) => input.tank.type !== "reef" && outsideRange(input.waterTest.ph, 6.5, 9),
  },
  {
    id: "RULE-0005-reef-ph-out-of-range",
    param: "ph",
    condition: "reef pH < 7.8 or > 8.55",
    tankTypes: ["reef"],
    severity: "yellow",
    message: "pH is outside the reef reference range.",
    why: "Reef chemistry references emphasize stable pH alongside alkalinity and salinity.",
    source: sources.reefChemistry,
    confidence: "low",
    reviewStatus: "unsigned",
    flags: ["ph_out_of_range"],
    checklist: [
      "Compare pH with alkalinity, salinity, and recent aeration changes.",
      "Avoid large sudden pH changes.",
    ],
    matches: (input) => input.tank.type === "reef" && outsideRange(input.waterTest.ph, 7.8, 8.55),
  },
  {
    id: "RULE-0006-reef-nitrate-drift",
    param: "nitrate",
    condition: "reef nitrate > 50 ppm",
    tankTypes: ["reef"],
    severity: "yellow",
    message: "Nitrate is above the reef review range.",
    why: "Reef chemistry guidance keeps nitrate bounded and emphasizes nutrient stability.",
    source: sources.reefChemistry,
    confidence: "low",
    reviewStatus: "unsigned",
    flags: ["nitrate_drift"],
    checklist: [
      "Confirm the result with a fresh test.",
      "Review feeding, export, source water, and recent livestock changes.",
    ],
    matches: (input) =>
      input.tank.type === "reef" &&
      valuePresent(input.waterTest.nitrate) &&
      input.waterTest.nitrate > 50,
  },
  {
    id: "RULE-0007-reef-salinity-drift",
    param: "salinityPpt",
    condition: "reef salinity < 34 ppt or > 36 ppt",
    tankTypes: ["reef"],
    severity: "yellow",
    message: "Reef salinity is outside the unsigned review range.",
    why: "Reef veterinary guidance lists salinity as 34-36 ppt or specific gravity 1.024-1.027.",
    source: sources.reefVet,
    confidence: "low",
    reviewStatus: "unsigned",
    flags: ["reef_stability_drift"],
    checklist: [
      "Confirm salinity with a calibrated instrument.",
      "Review trends before making large changes.",
    ],
    matches: (input) => input.tank.type === "reef" && outsideRange(input.waterTest.salinityPpt, 34, 36),
  },
  {
    id: "RULE-0008-freshwater-reef-parameters",
    param: "tank_type",
    condition: "freshwater/planted test includes reef-only parameters",
    tankTypes: ["fw", "planted"],
    severity: "yellow",
    message: "The readings include reef-only parameters for a freshwater or planted tank.",
    why: "Tank-type mismatch can produce misleading interpretation and should be corrected before scoring.",
    source: sources.merckRanges,
    confidence: "medium",
    reviewStatus: "unsigned",
    flags: ["tank_type_mismatch"],
    checklist: ["Check the tank type before interpreting reef-only fields."],
    matches: hasFreshwaterReefParameter,
  },
  {
    id: "RULE-0009-temperature-unscored",
    param: "tempC",
    condition: "temperature has no signed Phase 2A severity rule",
    tankTypes: [...appliesToAllTanks],
    severity: "yellow",
    message: "Temperature is collected but not yet scored by signed rules.",
    why: "Temperature and oxygen risks need domain-review sign-off before the product can make temperature severity claims.",
    source: sources.merckEnvironmental,
    confidence: "low",
    reviewStatus: "unsigned",
    flags: [],
    checklist: [],
    matches: (input) => valuePresent(input.waterTest.tempC),
  },
  {
    id: "RULE-0010-reef-alkalinity-drift",
    param: "alkalinityDkh",
    condition: "reef alkalinity < 7 dKH or > 11 dKH",
    tankTypes: ["reef"],
    severity: "yellow",
    message: "Reef alkalinity is outside the unsigned review range.",
    why: "Reef veterinary guidance lists alkalinity as 7-11 dKH equivalents.",
    source: sources.reefVet,
    confidence: "low",
    reviewStatus: "unsigned",
    flags: ["reef_stability_drift"],
    checklist: [
      "Confirm alkalinity in dKH or convert from meq/L or ppm CaCO3 before interpreting.",
      "Review trends before making large changes.",
    ],
    matches: (input) =>
      input.tank.type === "reef" && outsideRange(input.waterTest.alkalinityDkh, 7, 11),
  },
  {
    id: "RULE-0011-reef-calcium-drift",
    param: "calcium",
    condition: "reef calcium < 400 ppm or > 550 ppm",
    tankTypes: ["reef"],
    severity: "yellow",
    message: "Reef calcium is outside the unsigned review range.",
    why: "Reef chemistry guidance lists calcium around 400-550 ppm as a target range.",
    source: sources.reefChemistry,
    confidence: "low",
    reviewStatus: "unsigned",
    flags: ["reef_stability_drift"],
    checklist: ["Confirm calcium with a fresh test and review trend stability."],
    matches: (input) => input.tank.type === "reef" && outsideRange(input.waterTest.calcium, 400, 550),
  },
  {
    id: "RULE-0012-reef-magnesium-drift",
    param: "magnesium",
    condition: "reef magnesium < 1250 ppm or > 1400 ppm",
    tankTypes: ["reef"],
    severity: "yellow",
    message: "Reef magnesium is outside the unsigned review range.",
    why: "Reef chemistry guidance lists magnesium around 1250-1400 ppm as a target range.",
    source: sources.reefChemistry,
    confidence: "low",
    reviewStatus: "unsigned",
    flags: ["reef_stability_drift"],
    checklist: ["Confirm magnesium with a fresh test and review trend stability."],
    matches: (input) =>
      input.tank.type === "reef" && outsideRange(input.waterTest.magnesium, 1250, 1400),
  },
  {
    id: "RULE-0013-reef-phosphate-drift",
    param: "phosphate",
    condition: "reef phosphate > 0.3 ppm",
    tankTypes: ["reef"],
    severity: "yellow",
    message: "Reef phosphate is above the unsigned review range.",
    why: "Reef chemistry guidance discusses phosphate upper ranges around 0.3 ppm.",
    source: sources.reefChemistry,
    confidence: "low",
    reviewStatus: "unsigned",
    flags: ["reef_stability_drift"],
    checklist: ["Confirm phosphate with a fresh test and review nutrient trends."],
    matches: (input) =>
      input.tank.type === "reef" &&
      valuePresent(input.waterTest.phosphate) &&
      input.waterTest.phosphate > 0.3,
  },
];
