import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseConfig } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  const { url, anonKey } = getPublicSupabaseConfig();

  return createBrowserClient<Database>(url, anonKey);
}
