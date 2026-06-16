"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Stripe from "stripe";

import {
  checkoutPlanByValue,
  checkoutReadiness,
} from "@/lib/payments/checkout";
import { createClient } from "@/lib/supabase/server";

export async function createCheckoutSession(formData: FormData) {
  const plan = checkoutPlanByValue(formData.get("plan"));

  if (!plan) {
    redirect(`/billing?error=${encodeURIComponent("Unknown billing plan")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/billing");
  }

  const readiness = checkoutReadiness(plan);
  if (!readiness.configured || !readiness.priceId) {
    redirect(`/billing?error=${encodeURIComponent("Stripe Checkout is not configured for this plan yet")}`);
  }

  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ??
    requestHeaders.get("x-forwarded-host")?.replace(/^/, "https://") ??
    "http://localhost:3000";
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: readiness.priceId,
        quantity: 1,
      },
    ],
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    metadata: {
      user_id: user.id,
      plan,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan,
      },
    },
  });

  if (!session.url) {
    redirect(`/billing?error=${encodeURIComponent("Stripe did not return a Checkout URL")}`);
  }

  redirect(session.url);
}

