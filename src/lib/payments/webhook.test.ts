import Stripe from "stripe";
import { afterEach, describe, expect, it } from "vitest";

import { entitlementTransitionFromStripeEvent } from "./webhook";

const originalEnv = process.env;

afterEach(() => {
  process.env = { ...originalEnv };
});

function subscriptionEvent(
  overrides: Partial<Stripe.Subscription> = {},
  eventType = "customer.subscription.updated",
): Stripe.Event {
  return {
    id: "evt_123",
    object: "event",
    api_version: null,
    created: 1781560000,
    data: {
      object: {
        id: "sub_123",
        object: "subscription",
        customer: "cus_123",
        status: "active",
        current_period_end: 1781563600,
        metadata: {
          user_id: "123e4567-e89b-12d3-a456-426614174000",
        },
        items: {
          object: "list",
          data: [
            {
              id: "si_123",
              object: "subscription_item",
              price: {
                id: "price_hobby",
                object: "price",
              },
            },
          ],
          has_more: false,
          url: "",
        },
        ...overrides,
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: eventType,
  } as Stripe.Event;
}

describe("entitlementTransitionFromStripeEvent", () => {
  it("extracts a user entitlement transition from a signed subscription event", () => {
    process.env.STRIPE_PRICE_HOBBY_PRO = "price_hobby";

    expect(entitlementTransitionFromStripeEvent(subscriptionEvent())).toMatchObject({
      stripeEventId: "evt_123",
      stripeEventType: "customer.subscription.updated",
      stripeObjectId: "sub_123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      stripePriceId: "price_hobby",
      plan: "hobby_pro",
      status: "active",
      userId: "123e4567-e89b-12d3-a456-426614174000",
      businessId: null,
      currentPeriodEnd: "2026-06-15T22:46:40.000Z",
    });
  });

  it("rejects unknown prices, unknown statuses, and ambiguous ownership", () => {
    process.env.STRIPE_PRICE_HOBBY_PRO = "price_hobby";

    expect(
      entitlementTransitionFromStripeEvent(
        subscriptionEvent({
          items: {
            object: "list",
            data: [{ price: { id: "price_unknown" } } as Stripe.SubscriptionItem],
            has_more: false,
            url: "",
          },
        }),
      ),
    ).toBeNull();

    expect(entitlementTransitionFromStripeEvent(subscriptionEvent({ status: "paused" }))).toBeNull();
    expect(
      entitlementTransitionFromStripeEvent(
        subscriptionEvent({
          metadata: {
            user_id: "123e4567-e89b-12d3-a456-426614174000",
            business_id: "123e4567-e89b-12d3-a456-426614174111",
          },
        }),
      ),
    ).toBeNull();
  });

  it("ignores unrelated event types", () => {
    expect(entitlementTransitionFromStripeEvent(subscriptionEvent({}, "invoice.created"))).toBeNull();
  });
});
