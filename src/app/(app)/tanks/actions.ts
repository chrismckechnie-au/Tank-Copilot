"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  formDataToObject,
  litersFromInput,
  photoExtensionFromMimeType,
  tankFormSchema,
  targetRangesForTankType,
  validateCriticalWaterTestFields,
  validateWaterTestPhoto,
  waterTestFormSchema,
  waterTestPhotoConfig,
  type TankType,
} from "@/lib/tanks/validation";
import {
  buildRecommendationDraft,
  recommendationPersistedChecklist,
} from "@/lib/rules/recommendations";
import { createClient } from "@/lib/supabase/server";

function firstFieldError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "flatten" in error &&
    typeof error.flatten === "function"
  ) {
    const flattened = error.flatten();
    const firstField = Object.values(flattened.fieldErrors).flat()[0];
    return typeof firstField === "string" ? firstField : "Invalid form input";
  }

  return "Invalid form input";
}

export async function createTank(formData: FormData) {
  const parsed = tankFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(`/tanks/new?error=${encodeURIComponent(firstFieldError(parsed.error))}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/tanks/new");
  }

  const tank = parsed.data;
  const { data: tankId, error } = await supabase.rpc("create_hobby_tank", {
    p_name: tank.name,
    p_type: tank.type,
    p_volume_liters: litersFromInput(tank.volume, tank.unitSystem),
    p_unit_system: tank.unitSystem,
    p_start_date: tank.startDate ?? null,
    p_water_source: tank.waterSource,
    p_target_ranges: targetRangesForTankType(tank.type),
    p_equipment_category: tank.equipmentCategory ?? null,
    p_equipment_name: tank.equipmentName ?? null,
  });

  if (error || !tankId) {
    redirect(`/tanks/new?error=${encodeURIComponent("Could not create tank")}`);
  }

  revalidatePath("/dashboard");
  redirect(`/tanks/${tankId}/test`);
}

export async function logWaterTest(formData: FormData) {
  const parsed = waterTestFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(`/tanks/${formData.get("tankId")}/test?error=${encodeURIComponent(firstFieldError(parsed.error))}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=/tanks/${parsed.data.tankId}/test`);
  }

  const { data: tank, error: tankError } = await supabase
    .from("tanks")
    .select("id,type,volume_liters")
    .eq("id", parsed.data.tankId)
    .single();

  if (tankError || !tank) {
    redirect("/dashboard?error=tank-not-found");
  }

  const missing = validateCriticalWaterTestFields(parsed.data, tank.type as TankType);
  if (missing.length > 0) {
    redirect(
      `/tanks/${tank.id}/test?error=${encodeURIComponent(`Missing required fields: ${missing.join(", ")}`)}`,
    );
  }

  const photoValidation = validateWaterTestPhoto(formData.get("photo"));
  if (photoValidation.error) {
    redirect(`/tanks/${tank.id}/test?error=${encodeURIComponent(photoValidation.error)}`);
  }

  let photoPath: string | null = null;
  if (photoValidation.file) {
    photoPath = [
      user.id,
      tank.id,
      `${crypto.randomUUID()}.${photoExtensionFromMimeType(photoValidation.file.type)}`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from(waterTestPhotoConfig.bucket)
      .upload(photoPath, photoValidation.file, {
        contentType: photoValidation.file.type,
        upsert: false,
      });

    if (uploadError) {
      redirect(`/tanks/${tank.id}/test?error=${encodeURIComponent("Could not upload photo")}`);
    }
  }

  const input = parsed.data;
  const { data: savedTest, error } = await supabase
    .from("water_tests")
    .insert({
      tank_id: tank.id,
      ammonia: input.ammonia ?? null,
      nitrite: input.nitrite ?? null,
      nitrate: input.nitrate ?? null,
      ph: input.ph ?? null,
      temp_c: input.tempC ?? null,
      salinity: input.salinityPpt ?? null,
      kh: input.alkalinityDkh ?? null,
      gh: input.gh ?? null,
      phosphate: input.phosphate ?? null,
      calcium: input.calcium ?? null,
      magnesium: input.magnesium ?? null,
      notes: input.notes ?? "",
      photo_path: photoPath,
    })
    .select("id,ammonia,nitrite,nitrate,ph,temp_c,salinity,kh,gh,phosphate,calcium,magnesium")
    .single();

  if (error || !savedTest) {
    if (photoPath) {
      await supabase.storage.from(waterTestPhotoConfig.bucket).remove([photoPath]);
    }

    redirect(`/tanks/${tank.id}/test?error=${encodeURIComponent("Could not save water test")}`);
  }

  const recommendation = buildRecommendationDraft({
    tank: {
      id: tank.id,
      type: tank.type as TankType,
      volume_liters: tank.volume_liters,
    },
    waterTest: savedTest,
  });
  const { error: recommendationError } = await supabase.from("recommendations").insert({
    tank_id: recommendation.tankId,
    water_test_id: recommendation.waterTestId,
    source_event_id: recommendation.waterTestId,
    source_type: "water_test",
    severity: recommendation.severity,
    flags: recommendation.flags,
    rule_ids: recommendation.ruleIds,
    rule_version: recommendation.ruleVersion,
    explanation: recommendation.explanation,
    explanations: recommendation.explanations,
    checklist: recommendationPersistedChecklist(recommendation),
    confidence: recommendation.confidence,
    review_status: recommendation.reviewStatus,
    display_mode: recommendation.displayMode,
    missing_fields: recommendation.missingFields,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/tanks/${tank.id}`);
  revalidatePath(`/tanks/${tank.id}/results`);

  const resultParams = new URLSearchParams({ test: savedTest.id });
  if (recommendationError) {
    resultParams.set("warning", "recommendation-not-persisted");
  }

  redirect(`/tanks/${tank.id}/results?${resultParams.toString()}`);
}
