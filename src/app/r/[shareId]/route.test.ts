import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

const originalEnv = process.env;

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("/r/[shareId]", () => {
  it("rejects malformed share IDs before Supabase is touched", async () => {
    const response = await GET(new Request("https://example.test/r/not-a-token"), {
      params: Promise.resolve({ shareId: "not-a-token" }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.text()).resolves.toContain("Report link not found");
  });

  it("fails closed when public Supabase config is absent", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await GET(
      new Request("https://example.test/r/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
      {
        params: Promise.resolve({ shareId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }),
      },
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    await expect(response.text()).resolves.toContain("Report sharing is not configured");
  });
});
