import type { Json } from "@/lib/supabase/database.types";
import { sanitizeTankHistoryValue } from "@/lib/export/tank-history";

export type AccountExport = {
  exportedAt: string;
  profile: Json | null;
  entitlements: Json[];
  businesses: Json[];
  teamMemberships: Json[];
  clients: Json[];
  tanks: Json[];
  equipment: Json[];
  waterTests: Json[];
  recommendations: Json[];
  observations: Json[];
  maintenanceTasks: Json[];
  livestock: Json[];
  reports: Json[];
};

export function buildAccountExport(input: AccountExport): AccountExport {
  return {
    exportedAt: input.exportedAt,
    profile: input.profile ? sanitizeTankHistoryValue(input.profile) : null,
    entitlements: input.entitlements.map(sanitizeTankHistoryValue),
    businesses: input.businesses.map(sanitizeTankHistoryValue),
    teamMemberships: input.teamMemberships.map(sanitizeTankHistoryValue),
    clients: input.clients.map(sanitizeTankHistoryValue),
    tanks: input.tanks.map(sanitizeTankHistoryValue),
    equipment: input.equipment.map(sanitizeTankHistoryValue),
    waterTests: input.waterTests.map(sanitizeTankHistoryValue),
    recommendations: input.recommendations.map(sanitizeTankHistoryValue),
    observations: input.observations.map(sanitizeTankHistoryValue),
    maintenanceTasks: input.maintenanceTasks.map(sanitizeTankHistoryValue),
    livestock: input.livestock.map(sanitizeTankHistoryValue),
    reports: input.reports.map(sanitizeTankHistoryValue),
  };
}
