import { afterEach, describe, expect, it } from "vitest";

import { getEnv, getOptionalEnv, getPhase0ConfigStatus } from "./env";

const originalEnv = process.env;

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("env helpers", () => {
  it("throws for missing required env vars", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => getEnv("NEXT_PUBLIC_SUPABASE_URL")).toThrow(
      "Missing required environment variable",
    );
  });

  it("treats empty optional env vars as absent", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "";

    expect(getOptionalEnv("NEXT_PUBLIC_POSTHOG_KEY")).toBeUndefined();
  });

  it("reports Phase 0 config status without exposing secret values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "";
    process.env.AI_ENABLED = "true";
    process.env.ANTHROPIC_API_KEY = "";

    expect(getPhase0ConfigStatus()).toEqual({
      supabaseUrl: true,
      supabaseAnonKey: true,
      posthogKey: false,
      anthropicEnabled: false,
    });
  });
});
