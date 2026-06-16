"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { maybeEnhancePublicReport } from "@/lib/ai/report";
import { buildReportContent, reportJson } from "@/lib/reports/builder";
import {
  buildRecommendationDraft,
  recommendationDraftFromRecord,
} from "@/lib/rules/recommendations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { TankType } from "@/lib/tanks/validation";

const tankReportSchema = z.object({
  tankId: z.string().uuid(),
});

const reportShareSchema = tankReportSchema.extend({
  reportId: z.string().uuid(),
});

const shareDurationMs = 30 * 24 * 60 * 60 * 1000;

export async function generateReport(formData: FormData) {
  const parsed = tankReportSchema.safeParse({
    tankId: formData.get("tankId"),
  });

  if (!parsed.success) {
    redirect("/dashboard?error=invalid-report-request");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=/tanks/${parsed.data.tankId}/reports`);
  }

  const { data: tank } = await supabase
    .from("tanks")
    .select("id,name,type,volume_liters")
    .eq("id", parsed.data.tankId)
    .single();

  if (!tank) {
    redirect("/dashboard?error=tank-not-found");
  }

  const { data: latestTests } = await supabase
    .from("water_tests")
    .select(
      "id,tested_at,ammonia,nitrite,nitrate,ph,temp_c,salinity,kh,gh,phosphate,calcium,magnesium",
    )
    .eq("tank_id", tank.id)
    .order("tested_at", { ascending: false })
    .limit(1);
  const latestWaterTest = latestTests?.[0];

  if (!latestWaterTest) {
    redirect(`/tanks/${tank.id}/reports?error=${encodeURIComponent("Log a water test before generating a report")}`);
  }

  const { data: persistedRecommendation } = await supabase
    .from("recommendations")
    .select(
      "tank_id,water_test_id,severity,flags,rule_ids,rule_version,explanation,explanations,checklist,confidence,review_status,display_mode,missing_fields",
    )
    .eq("water_test_id", latestWaterTest.id)
    .maybeSingle();
  const recommendation = persistedRecommendation
    ? recommendationDraftFromRecord(persistedRecommendation)
    : buildRecommendationDraft({
        tank: {
          id: tank.id,
          type: tank.type as TankType,
          volume_liters: tank.volume_liters,
        },
        waterTest: latestWaterTest,
      });

  const { data: observations } = await supabase
    .from("observations")
    .select("id,symptoms,affected_livestock,recent_changes,photo_paths,follow_up_prompts")
    .eq("tank_id", tank.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const report = buildReportContent({
    generatedAt: new Date().toISOString(),
    tank: {
      id: tank.id,
      name: tank.name,
      type: tank.type as TankType,
      volume_liters: tank.volume_liters,
    },
    latestWaterTest,
    recommendation: {
      severity: recommendation.severity,
      rule_version: recommendation.ruleVersion,
      explanation: recommendation.explanation,
      explanations: recommendation.explanations,
      checklist: recommendation.checklist,
      confidence: recommendation.confidence,
      review_status: recommendation.reviewStatus,
      display_mode: recommendation.displayMode,
      missing_fields: recommendation.missingFields,
    },
    observations: observations ?? [],
  });
  const publicReport = await maybeEnhancePublicReport(report.public);
  const fullReport = {
    ...report.full,
    publicProjection: publicReport,
  };

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    redirect(`/tanks/${tank.id}/reports?error=${encodeURIComponent("Report service is not configured")}`);
  }

  const { data: savedReport, error } = await admin
    .from("reports")
    .insert({
      tank_id: tank.id,
      owner_user_id: user.id,
      business_id: null,
      type: "community",
      content: reportJson(fullReport),
      sanitized_public_content: reportJson(publicReport),
      share_enabled: false,
      share_expires_at: null,
    })
    .select("id")
    .single();

  if (error || !savedReport) {
    redirect(`/tanks/${tank.id}/reports?error=${encodeURIComponent("Could not generate report")}`);
  }

  revalidatePath(`/tanks/${tank.id}`);
  revalidatePath(`/tanks/${tank.id}/reports`);
  redirect(`/tanks/${tank.id}/reports?report=${savedReport.id}`);
}

export async function enableReportShare(formData: FormData) {
  await updateReportShare(formData, true);
}

export async function revokeReportShare(formData: FormData) {
  await updateReportShare(formData, false);
}

async function updateReportShare(formData: FormData, enabled: boolean) {
  const parsed = reportShareSchema.safeParse({
    tankId: formData.get("tankId"),
    reportId: formData.get("reportId"),
  });

  if (!parsed.success) {
    redirect("/dashboard?error=invalid-report-request");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=/tanks/${parsed.data.tankId}/reports`);
  }

  const { error } = await supabase
    .from("reports")
    .update({
      share_enabled: enabled,
      share_expires_at: enabled
        ? new Date(Date.now() + shareDurationMs).toISOString()
        : null,
    })
    .eq("id", parsed.data.reportId)
    .eq("tank_id", parsed.data.tankId)
    .select("id")
    .single();

  if (error) {
    redirect(`/tanks/${parsed.data.tankId}/reports?error=${encodeURIComponent("Could not update share link")}`);
  }

  revalidatePath(`/tanks/${parsed.data.tankId}/reports`);
  redirect(`/tanks/${parsed.data.tankId}/reports?report=${parsed.data.reportId}`);
}
