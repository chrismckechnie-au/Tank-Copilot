import Stripe from "stripe";

import { entitlementTransitionFromStripeEvent } from "@/lib/payments/webhook";
import { getServerEnv } from "@/lib/server-env";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(getServerEnv("STRIPE_SECRET_KEY"));
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      getServerEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  const transition = entitlementTransitionFromStripeEvent(event);
  if (!transition) {
    return Response.json({ received: true, ignored: true });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("process_stripe_subscription_event", {
    p_stripe_event_id: transition.stripeEventId,
    p_stripe_event_type: transition.stripeEventType,
    p_stripe_object_id: transition.stripeObjectId,
    p_stripe_customer_id: transition.stripeCustomerId,
    p_stripe_subscription_id: transition.stripeSubscriptionId,
    p_stripe_price_id: transition.stripePriceId,
    p_plan: transition.plan,
    p_status: transition.status,
    p_user_id: transition.userId,
    p_business_id: transition.businessId,
    p_current_period_end: transition.currentPeriodEnd,
  });

  if (error) {
    return Response.json({ error: "webhook_processing_failed" }, { status: 500 });
  }

  return Response.json({ received: true, result: data });
}
