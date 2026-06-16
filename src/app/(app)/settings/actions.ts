"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const confirmationText = "DELETE MY ACCOUNT";

export async function deleteAccount(formData: FormData) {
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== confirmationText) {
    redirect(`/settings?error=${encodeURIComponent("Type DELETE MY ACCOUNT to confirm deletion")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/settings");
  }

  const { data: ownedBusinesses, error: businessError } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  if (businessError) {
    redirect(`/settings?error=${encodeURIComponent("Could not verify business ownership")}`);
  }

  if ((ownedBusinesses ?? []).length > 0) {
    redirect(
      `/settings?error=${encodeURIComponent("Transfer or close business ownership before deleting this account")}`,
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    redirect(`/settings?error=${encodeURIComponent("Account deletion is not configured")}`);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent("Could not delete account")}`);
  }

  redirect("/");
}
