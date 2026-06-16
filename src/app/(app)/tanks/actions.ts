"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  formDataToObject,
  litersFromInput,
  tankFormSchema,
  targetRangesForTankType,
  validateCriticalWaterTestFields,
  validateWaterTestPhoto,
  waterTestFormSchema,
  waterTestPhotoConfig,
  type TankType,
} from "@/lib/tanks/validation";
import { sanitizeImageFile } from "@/lib/images/sanitize";
import {
  formDataToMaintenanceTaskObject,
  formDataToRescheduleTaskObject,
  formDataToTaskIdObject,
  maintenanceRescheduleFormSchema,
  maintenanceTaskFormSchema,
  maintenanceTaskIdSchema,
} from "@/lib/maintenance/validation";
import {
  formDataToObservationObject,
  observationFormSchema,
} from "@/lib/triage/validation";
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

function safeTankPath(formData: FormData, suffix: string) {
  const tankId = formData.get("tankId");

  if (
    typeof tankId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tankId,
    )
  ) {
    return `/tanks/${tankId}${suffix}`;
  }

  return "/dashboard";
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
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
    redirect(
      `${safeTankPath(formData, "/test")}?error=${encodeURIComponent(firstFieldError(parsed.error))}`,
    );
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
    const sanitizedPhoto = await sanitizeImageFile(photoValidation.file);
    if (sanitizedPhoto.error || !sanitizedPhoto.image) {
      redirect(
        `/tanks/${tank.id}/test?error=${encodeURIComponent(sanitizedPhoto.error ?? "Could not process photo")}`,
      );
    }

    photoPath = [
      user.id,
      tank.id,
      `${crypto.randomUUID()}.${sanitizedPhoto.image.extension}`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from(waterTestPhotoConfig.bucket)
      .upload(photoPath, sanitizedPhoto.image.data, {
        contentType: sanitizedPhoto.image.contentType,
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

export async function logObservation(formData: FormData) {
  const parsed = observationFormSchema.safeParse(formDataToObservationObject(formData));

  if (!parsed.success) {
    redirect(
      `${safeTankPath(formData, "/triage")}?error=${encodeURIComponent(firstFieldError(parsed.error))}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=/tanks/${parsed.data.tankId}/triage`);
  }

  const { data: tank, error: tankError } = await supabase
    .from("tanks")
    .select("id")
    .eq("id", parsed.data.tankId)
    .single();

  if (tankError || !tank) {
    redirect("/dashboard?error=tank-not-found");
  }

  const photoValidation = validateWaterTestPhoto(formData.get("photo"));
  if (photoValidation.error) {
    redirect(`/tanks/${tank.id}/triage?error=${encodeURIComponent(photoValidation.error)}`);
  }

  const photoPaths: string[] = [];
  if (photoValidation.file) {
    const sanitizedPhoto = await sanitizeImageFile(photoValidation.file);
    if (sanitizedPhoto.error || !sanitizedPhoto.image) {
      redirect(
        `/tanks/${tank.id}/triage?error=${encodeURIComponent(sanitizedPhoto.error ?? "Could not process photo")}`,
      );
    }

    const photoPath = [
      user.id,
      tank.id,
      "observations",
      `${crypto.randomUUID()}.${sanitizedPhoto.image.extension}`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from(waterTestPhotoConfig.bucket)
      .upload(photoPath, sanitizedPhoto.image.data, {
        contentType: sanitizedPhoto.image.contentType,
        upsert: false,
      });

    if (uploadError) {
      redirect(`/tanks/${tank.id}/triage?error=${encodeURIComponent("Could not upload photo")}`);
    }

    photoPaths.push(photoPath);
  }

  const observation = parsed.data;
  const { error } = await supabase.rpc("create_observation", {
    p_tank_id: tank.id,
    p_symptoms: observation.symptoms,
    p_affected_livestock: observation.affectedLivestock,
    p_recent_changes: observation.recentChanges,
    p_photo_paths: photoPaths,
  });

  if (error) {
    if (photoPaths.length > 0) {
      await supabase.storage.from(waterTestPhotoConfig.bucket).remove(photoPaths);
    }

    redirect(`/tanks/${tank.id}/triage?error=${encodeURIComponent("Could not save observation")}`);
  }

  revalidatePath(`/tanks/${tank.id}`);
  revalidatePath(`/tanks/${tank.id}/triage`);
  redirect(`/tanks/${tank.id}/triage?saved=1`);
}

export async function createMaintenanceTask(formData: FormData) {
  const parsed = maintenanceTaskFormSchema.safeParse(
    formDataToMaintenanceTaskObject(formData),
  );

  if (!parsed.success) {
    redirect(
      `${safeTankPath(formData, "/tasks")}?error=${encodeURIComponent(firstFieldError(parsed.error))}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=/tanks/${parsed.data.tankId}/tasks`);
  }

  const { data: tank, error: tankError } = await supabase
    .from("tanks")
    .select("id")
    .eq("id", parsed.data.tankId)
    .single();

  if (tankError || !tank) {
    redirect("/dashboard?error=tank-not-found");
  }

  const task = parsed.data;
  const { error } = await supabase.from("maintenance_tasks").insert({
    tank_id: tank.id,
    title: task.title,
    category: task.category,
    cadence_days: task.cadenceDays,
    next_due_on: task.nextDueOn ?? todayIsoDate(),
    reminder_enabled: task.reminderEnabled,
  });

  if (error) {
    redirect(`/tanks/${tank.id}/tasks?error=${encodeURIComponent("Could not create task")}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/tanks/${tank.id}`);
  revalidatePath(`/tanks/${tank.id}/tasks`);
  redirect(`/tanks/${tank.id}/tasks?saved=task-created`);
}

export async function completeMaintenanceTask(formData: FormData) {
  const parsed = maintenanceTaskIdSchema.safeParse(formDataToTaskIdObject(formData));

  if (!parsed.success) {
    redirect(
      `${safeTankPath(formData, "/tasks")}?error=${encodeURIComponent(firstFieldError(parsed.error))}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=/tanks/${parsed.data.tankId}/tasks`);
  }

  const { error } = await supabase.rpc("complete_maintenance_task", {
    p_task_id: parsed.data.taskId,
    p_completed_on: todayIsoDate(),
  });

  if (error) {
    redirect(
      `/tanks/${parsed.data.tankId}/tasks?error=${encodeURIComponent("Could not complete task")}`,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/tanks/${parsed.data.tankId}`);
  revalidatePath(`/tanks/${parsed.data.tankId}/tasks`);
  redirect(`/tanks/${parsed.data.tankId}/tasks?saved=task-completed`);
}

export async function rescheduleMaintenanceTask(formData: FormData) {
  const parsed = maintenanceRescheduleFormSchema.safeParse(
    formDataToRescheduleTaskObject(formData),
  );

  if (!parsed.success) {
    redirect(
      `${safeTankPath(formData, "/tasks")}?error=${encodeURIComponent(firstFieldError(parsed.error))}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=/tanks/${parsed.data.tankId}/tasks`);
  }

  const { error } = await supabase.rpc("reschedule_maintenance_task", {
    p_task_id: parsed.data.taskId,
    p_next_due_on: parsed.data.nextDueOn,
  });

  if (error) {
    redirect(
      `/tanks/${parsed.data.tankId}/tasks?error=${encodeURIComponent("Could not reschedule task")}`,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/tanks/${parsed.data.tankId}`);
  revalidatePath(`/tanks/${parsed.data.tankId}/tasks`);
  redirect(`/tanks/${parsed.data.tankId}/tasks?saved=task-rescheduled`);
}
