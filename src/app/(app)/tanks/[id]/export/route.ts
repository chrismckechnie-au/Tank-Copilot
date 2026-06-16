import { NextRequest } from "next/server";

import { hasPublicSupabaseConfig } from "@/lib/env";
import { buildTankHistoryExport, tankHistoryToCsv } from "@/lib/export/tank-history";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasPublicSupabaseConfig()) {
    return Response.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: tank, error: tankError } = await supabase
    .from("tanks")
    .select("*")
    .eq("id", id)
    .single();

  if (tankError || !tank) {
    return Response.json({ error: "tank_not_found" }, { status: 404 });
  }

  const [
    equipment,
    waterTests,
    recommendations,
    observations,
    maintenanceTasks,
    livestock,
    reports,
  ] = await Promise.all([
    supabase.from("tank_equipment").select("*").eq("tank_id", tank.id),
    supabase.from("water_tests").select("*").eq("tank_id", tank.id).order("tested_at"),
    supabase.from("recommendations").select("*").eq("tank_id", tank.id).order("created_at"),
    supabase.from("observations").select("*").eq("tank_id", tank.id).order("created_at"),
    supabase.from("maintenance_tasks").select("*").eq("tank_id", tank.id).order("next_due_on"),
    supabase.from("livestock").select("*").eq("tank_id", tank.id).order("created_at"),
    supabase
      .from("reports")
      .select("id,tank_id,owner_user_id,business_id,type,generated_at,content,sanitized_public_content,share_enabled,share_expires_at,created_at,updated_at")
      .eq("tank_id", tank.id)
      .order("generated_at"),
  ]);
  const failedSection = [
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
      { error: "export_section_failed", section: failedSection[0] },
      { status: 500 },
    );
  }

  const history = buildTankHistoryExport({
    exportedAt: new Date().toISOString(),
    tank: tank as Json,
    equipment: rows(equipment.data),
    waterTests: rows(waterTests.data),
    recommendations: rows(recommendations.data),
    observations: rows(observations.data),
    maintenanceTasks: rows(maintenanceTasks.data),
    livestock: rows(livestock.data),
    reports: rows(reports.data),
  });
  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const filename = `tank-${tank.id}-history.${format === "csv" ? "csv" : "json"}`;

  if (format === "csv") {
    return new Response(tankHistoryToCsv(history), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  }

  return Response.json(history, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function rows(value: unknown[] | null): Json[] {
  return (value ?? []) as Json[];
}
