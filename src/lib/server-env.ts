import "server-only";

type ServerEnvKey = "SUPABASE_SERVICE_ROLE_KEY" | "SUPABASE_DATABASE_URL";

export function getServerEnv(name: ServerEnvKey): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}

export function getServerSupabaseConfig() {
  return {
    serviceRoleKey: getServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    databaseUrl: getServerEnv("SUPABASE_DATABASE_URL"),
  };
}
