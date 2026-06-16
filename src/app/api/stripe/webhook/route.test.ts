import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const originalEnv = process.env;

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Stripe webhook route", () => {
  it("rejects requests with no Stripe signature before mutation", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("https://app.example.com/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "missing_signature" });
  });

  it("rejects invalid signatures before mutation", async () => {
    const { POST } = await import("./route");
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

    const response = await POST(new Request("https://app.example.com/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({ id: "evt_invalid", object: "event" }),
      headers: {
        "stripe-signature": "t=1,v1=invalid",
      },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_signature" });
  });
});
