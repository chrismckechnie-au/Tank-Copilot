import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/server-env";
import type { Database } from "@/lib/supabase/database.types";

export function createAdminClient() {
  return createClient<Database>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
