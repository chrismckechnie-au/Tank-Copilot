import { afterEach, describe, expect, it } from "vitest";

import {
  checkoutPlanByValue,
  checkoutReadiness,
} from "./checkout";

const envKeys = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_HOBBY_PRO",
  "STRIPE_PRICE_REEF_PRO",
  "STRIPE_PRICE_SERVICE_PRO",
  "STRIPE_PRICE_LFS",
];

describe("checkoutReadiness", () => {
  afterEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  it("reports missing Stripe secret and plan price without exposing values", () => {
    expect(checkoutReadiness("reef_pro")).toEqual({
      configured: false,
      priceId: null,
      missing: ["STRIPE_SECRET_KEY", "STRIPE_PRICE_REEF_PRO"],
    });
  });

  it("marks a plan configured when secret and price env vars exist", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_secret";
    process.env.STRIPE_PRICE_SERVICE_PRO = "price_service";

    expect(checkoutReadiness("service_pro")).toEqual({
      configured: true,
      priceId: "price_service",
      missing: [],
    });
  });
});

describe("checkoutPlanByValue", () => {
  it("only accepts known paid plans", () => {
    expect(checkoutPlanByValue("hobby_pro")).toBe("hobby_pro");
    expect(checkoutPlanByValue("free")).toBeNull();
    expect(checkoutPlanByValue("enterprise")).toBeNull();
  });
});

