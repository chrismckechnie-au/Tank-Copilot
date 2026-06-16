import type { Json } from "@/lib/supabase/database.types";

export type TankHistoryExport = {
  exportedAt: string;
  tank: Json;
  equipment: Json[];
  waterTests: Json[];
  recommendations: Json[];
  observations: Json[];
  maintenanceTasks: Json[];
  livestock: Json[];
  reports: Json[];
};

const privateArtifactKeys = new Set([
  "pdf_path",
  "pdfPath",
  "photo_path",
  "photoPath",
  "photo_paths",
  "photoPaths",
  "share_id",
  "shareId",
]);

export function buildTankHistoryExport(input: TankHistoryExport): TankHistoryExport {
  return {
    exportedAt: input.exportedAt,
    tank: sanitizeTankHistoryValue(input.tank),
    equipment: input.equipment.map(sanitizeTankHistoryValue),
    waterTests: input.waterTests.map(sanitizeTankHistoryValue),
    recommendations: input.recommendations.map(sanitizeTankHistoryValue),
    observations: input.observations.map(sanitizeTankHistoryValue),
    maintenanceTasks: input.maintenanceTasks.map(sanitizeTankHistoryValue),
    livestock: input.livestock.map(sanitizeTankHistoryValue),
    reports: input.reports.map(sanitizeTankHistoryValue),
  };
}

export function sanitizeTankHistoryValue(value: Json): Json {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeTankHistoryValue);
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !privateArtifactKeys.has(key))
      .map(([key, nestedValue]) => [key, sanitizeTankHistoryValue(nestedValue as Json)]),
  );
}

export function tankHistoryToCsv(history: TankHistoryExport) {
  const rows = [
    ["section", "record_index", "field", "value"],
    ...objectRows("tank", 0, history.tank),
    ...arrayRows("equipment", history.equipment),
    ...arrayRows("water_tests", history.waterTests),
    ...arrayRows("recommendations", history.recommendations),
    ...arrayRows("observations", history.observations),
    ...arrayRows("maintenance_tasks", history.maintenanceTasks),
    ...arrayRows("livestock", history.livestock),
    ...arrayRows("reports", history.reports),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function arrayRows(section: string, records: Json[]) {
  return records.flatMap((record, index) => objectRows(section, index, record));
}

function objectRows(section: string, index: number, record: Json) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return [[section, String(index), "value", stringifyValue(record)]];
  }

  return Object.entries(record).map(([field, value]) => [
    section,
    String(index),
    field,
    stringifyValue(value),
  ]);
}

function stringifyValue(value: Json | undefined) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function csvCell(value: string) {
  const safeValue = /^[\s\x00-\x1f]*[=+\-@]/.test(value) ? `'${value}` : value;

  if (!/[",\n\r]/.test(safeValue)) {
    return safeValue;
  }

  return `"${safeValue.replaceAll("\"", "\"\"")}"`;
}
