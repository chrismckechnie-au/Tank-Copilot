"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  businessFormSchema,
  clientFormSchema,
  clientTankFormSchema,
  formDataToBusinessObject,
  formDataToClientObject,
  formDataToClientTankObject,
  formDataToTeamMemberObject,
  teamMemberFormSchema,
  teamMemberIdFormSchema,
} from "@/lib/business/validation";
import { isCommercialModeEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  litersFromInput,
  targetRangesForTankType,
} from "@/lib/tanks/validation";

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

function ensureCommercialMode(path: string) {
  if (!isCommercialModeEnabled()) {
    redirect(`${path}?error=${encodeURIComponent("Commercial mode is not enabled")}`);
  }
}

export async function createBusiness(formData: FormData) {
  ensureCommercialMode("/businesses");

  const parsed = businessFormSchema.safeParse(formDataToBusinessObject(formData));
  if (!parsed.success) {
    redirect(`/businesses?error=${encodeURIComponent(firstFieldError(parsed.error))}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/businesses");
  }

  const { data: businessId, error } = await supabase.rpc("create_business", {
    p_name: parsed.data.name,
    p_logo_path: parsed.data.logoPath ?? null,
  });

  if (error || !businessId) {
    redirect(`/businesses?error=${encodeURIComponent("Could not create business")}`);
  }

  revalidatePath("/businesses");
  redirect(`/businesses/${businessId}`);
}

export async function createClientRecord(formData: FormData) {
  const parsed = clientFormSchema.safeParse(formDataToClientObject(formData));
  const businessPath = parsed.success ? `/businesses/${parsed.data.businessId}` : "/businesses";
  ensureCommercialMode(businessPath);

  if (!parsed.success) {
    redirect(`/businesses?error=${encodeURIComponent(firstFieldError(parsed.error))}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=/businesses/${parsed.data.businessId}`);
  }

  const { error } = await supabase.from("clients").insert({
    business_id: parsed.data.businessId,
    name: parsed.data.name,
    contact: parsed.data.contact,
    location: parsed.data.location,
    notes: parsed.data.notes,
  });

  if (error) {
    redirect(`${businessPath}?error=${encodeURIComponent("Could not create client")}`);
  }

  revalidatePath(businessPath);
  redirect(`${businessPath}?saved=client-created`);
}

export async function addTeamMember(formData: FormData) {
  const parsed = teamMemberFormSchema.safeParse(formDataToTeamMemberObject(formData));
  const businessPath = parsed.success ? `/businesses/${parsed.data.businessId}` : "/businesses";
  ensureCommercialMode(businessPath);

  if (!parsed.success) {
    redirect(`${businessPath}?error=${encodeURIComponent(firstFieldError(parsed.error))}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=/businesses/${parsed.data.businessId}`);
  }

  const { error } = await supabase.from("team_members").insert({
    business_id: parsed.data.businessId,
    user_id: parsed.data.userId,
    role: parsed.data.role,
  });

  if (error) {
    redirect(`${businessPath}?error=${encodeURIComponent("Could not add team member")}`);
  }

  revalidatePath(businessPath);
  redirect(`${businessPath}?saved=member-added`);
}

export async function removeTeamMember(formData: FormData) {
  const parsed = teamMemberIdFormSchema.safeParse(formDataToTeamMemberObject(formData));
  const businessPath = parsed.success ? `/businesses/${parsed.data.businessId}` : "/businesses";
  ensureCommercialMode(businessPath);

  if (!parsed.success) {
    redirect(`${businessPath}?error=${encodeURIComponent(firstFieldError(parsed.error))}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=/businesses/${parsed.data.businessId}`);
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("business_id", parsed.data.businessId)
    .eq("user_id", parsed.data.userId)
    .select("user_id")
    .single();

  if (error) {
    redirect(`${businessPath}?error=${encodeURIComponent("Could not remove team member")}`);
  }

  revalidatePath(businessPath);
  redirect(`${businessPath}?saved=member-removed`);
}

export async function createClientTank(formData: FormData) {
  const parsed = clientTankFormSchema.safeParse(formDataToClientTankObject(formData));
  const businessPath = parsed.success ? `/businesses/${parsed.data.businessId}` : "/businesses";
  ensureCommercialMode(businessPath);

  if (!parsed.success) {
    redirect(`${businessPath}?error=${encodeURIComponent(firstFieldError(parsed.error))}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=/businesses/${parsed.data.businessId}`);
  }

  const tank = parsed.data;
  const { data: tankId, error } = await supabase.rpc("create_client_tank", {
    p_business_id: tank.businessId,
    p_client_id: tank.clientId,
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
    redirect(`${businessPath}?error=${encodeURIComponent("Could not create client tank")}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(businessPath);
  redirect(`/tanks/${tankId}/test`);
}
