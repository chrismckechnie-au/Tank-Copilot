import Stripe from "stripe";

import {
  isKnownEntitlementStatus,
  planFromStripePriceId,
  type EntitlementStatus,
} from "./plans";

export type EntitlementTransition = {
  stripeEventId: string;
  stripeEventType: string;
  stripeObjectId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  plan: "hobby_pro" | "reef_pro" | "service_pro" | "lfs";
  status: EntitlementStatus;
  userId: string | null;
  businessId: string | null;
  currentPeriodEnd: string | null;
};

const handledEvents = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export function entitlementTransitionFromStripeEvent(
  event: Stripe.Event,
): EntitlementTransition | null {
  if (!handledEvents.has(event.type)) {
    return null;
  }

  const subscription = event.data.object as Stripe.Subscription;
  const stripePriceId = subscription.items.data[0]?.price.id;
  const plan = planFromStripePriceId(stripePriceId);
  const status = subscription.status;

  if (!stripePriceId || !plan || !isKnownEntitlementStatus(status)) {
    return null;
  }

  const userId = cleanUuid(subscription.metadata.user_id);
  const businessId = cleanUuid(subscription.metadata.business_id);

  if (Boolean(userId) === Boolean(businessId)) {
    return null;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const currentPeriodEnd = (subscription as { current_period_end?: number | null })
    .current_period_end;

  return {
    stripeEventId: event.id,
    stripeEventType: event.type,
    stripeObjectId: subscription.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId,
    plan,
    status,
    userId,
    businessId,
    currentPeriodEnd: timestampToIso(currentPeriodEnd),
  };
}

function cleanUuid(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}

function timestampToIso(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}
