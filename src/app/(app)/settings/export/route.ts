import { hasPublicSupabaseConfig } from "@/lib/env";
import { buildAccountExport } from "@/lib/export/account";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (!hasPublicSupabaseConfig()) {
    return Response.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const [profile, entitlements, businesses, teamMemberships, tanks] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("entitlements").select("*").order("created_at"),
    supabase.from("businesses").select("*").order("created_at"),
    supabase.from("team_members").select("*").order("created_at"),
    supabase.from("tanks").select("*").order("created_at"),
  ]);
  const tankIds = extractStringIds(tanks.data);
  const businessIds = extractStringIds(businesses.data);

  const [
    clients,
    equipment,
    waterTests,
    recommendations,
    observations,
    maintenanceTasks,
    livestock,
    reports,
  ] = await Promise.all([
    businessIds.length
      ? supabase.from("clients").select("*").in("business_id", businessIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    tankIds.length
      ? supabase.from("tank_equipment").select("*").in("tank_id", tankIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    tankIds.length
      ? supabase.from("water_tests").select("*").in("tank_id", tankIds).order("tested_at")
      : Promise.resolve({ data: [], error: null }),
    tankIds.length
      ? supabase.from("recommendations").select("*").in("tank_id", tankIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    tankIds.length
      ? supabase.from("observations").select("*").in("tank_id", tankIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    tankIds.length
      ? supabase.from("maintenance_tasks").select("*").in("tank_id", tankIds).order("next_due_on")
      : Promise.resolve({ data: [], error: null }),
    tankIds.length
      ? supabase.from("livestock").select("*").in("tank_id", tankIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    tankIds.length
      ? supabase
          .from("reports")
          .select("id,tank_id,owner_user_id,business_id,type,generated_at,content,sanitized_public_content,share_enabled,share_expires_at,created_at,updated_at")
          .in("tank_id", tankIds)
          .order("generated_at")
      : Promise.resolve({ data: [], error: null }),
  ]);

  const failedSection = [
    ["profile", profile.error],
    ["entitlements", entitlements.error],
    ["businesses", businesses.error],
    ["team_members", teamMemberships.error],
    ["tanks", tanks.error],
    ["clients", clients.error],
    ["equipment", equipment.error],
    ["water_tests", waterTests.error],
    ["recommendations", recommendations.error],
    ["observations", observations.error],
    ["maintenance_tasks", maintenanceTasks.error],
    ["livestock", livestock.error],
    ["reports", reports.error],
  ].find(([, error]) => error);

  if (failedSection) {
    return Response.json(
      { error: "account_export_section_failed", section: failedSection[0] },
      { status: 500 },
    );
  }

  return Response.json(
    buildAccountExport({
      exportedAt: new Date().toISOString(),
      profile: (profile.data as Json | null) ?? null,
      entitlements: rows(entitlements.data),
      businesses: rows(businesses.data),
      teamMemberships: rows(teamMemberships.data),
      clients: rows(clients.data),
      tanks: rows(tanks.data),
      equipment: rows(equipment.data),
      waterTests: rows(waterTests.data),
      recommendations: rows(recommendations.data),
      observations: rows(observations.data),
      maintenanceTasks: rows(maintenanceTasks.data),
      livestock: rows(livestock.data),
      reports: rows(reports.data),
    }),
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="tank-copilot-account-export.json"`,
      },
    },
  );
}

function rows(value: unknown[] | null): Json[] {
  return (value ?? []) as Json[];
}

function extractStringIds(value: unknown[] | null): string[] {
  return (value ?? []).flatMap((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return [];
    }

    const id = (row as { id?: unknown }).id;
    return typeof id === "string" ? [id] : [];
  });
}
