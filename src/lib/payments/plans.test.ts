import { afterEach, describe, expect, it } from "vitest";

import {
  isActiveEntitlementStatus,
  isKnownEntitlementStatus,
  planFromStripePriceId,
} from "./plans";

const originalEnv = process.env;

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("payment plan helpers", () => {
  it("maps configured Stripe price IDs to internal plans", () => {
    process.env.STRIPE_PRICE_REEF_PRO = "price_reef";
    process.env.STRIPE_PRICE_SERVICE_PRO = "price_service";

    expect(planFromStripePriceId("price_reef")).toBe("reef_pro");
    expect(planFromStripePriceId("price_service")).toBe("service_pro");
    expect(planFromStripePriceId("price_unknown")).toBeNull();
  });

  it("classifies entitlement statuses conservatively", () => {
    expect(isActiveEntitlementStatus("active")).toBe(true);
    expect(isActiveEntitlementStatus("trialing")).toBe(true);
    expect(isActiveEntitlementStatus("past_due")).toBe(false);
    expect(isKnownEntitlementStatus("canceled")).toBe(true);
    expect(isKnownEntitlementStatus("paused")).toBe(false);
  });
});
