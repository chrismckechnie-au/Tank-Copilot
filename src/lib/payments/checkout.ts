import type { PaidEntitlementPlan } from "./plans";
import { priceEnvByPlan } from "./plans";

export type CheckoutPlan = {
  plan: PaidEntitlementPlan;
  name: string;
  description: string;
  audience: string;
};

export type CheckoutReadiness = {
  configured: boolean;
  priceId: string | null;
  missing: string[];
};

export const checkoutPlans: CheckoutPlan[] = [
  {
    plan: "hobby_pro",
    name: "Hobby Pro",
    audience: "Growing freshwater and planted tanks",
    description: "History exports, trends, reminders, and richer tank tracking.",
  },
  {
    plan: "reef_pro",
    name: "Reef Pro",
    audience: "Reef keepers tracking stability",
    description: "Reef parameters, stability guardrails, and advanced report history.",
  },
  {
    plan: "service_pro",
    name: "Service Pro",
    audience: "Aquarium maintenance businesses",
    description: "Business/client mode, branded reports, and team-ready workflows.",
  },
  {
    plan: "lfs",
    name: "LFS",
    audience: "Retail stores and local fish shops",
    description: "Customer-facing reporting workflows for in-store water testing.",
  },
];

export function checkoutReadiness(plan: PaidEntitlementPlan): CheckoutReadiness {
  const missing: string[] = [];
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const priceEnvName = priceEnvByPlan[plan];
  const priceId = process.env[priceEnvName] ?? null;

  if (!stripeSecretKey) {
    missing.push("STRIPE_SECRET_KEY");
  }

  if (!priceId) {
    missing.push(priceEnvName);
  }

  return {
    configured: missing.length === 0,
    priceId,
    missing,
  };
}

export function checkoutPlanByValue(
  value: FormDataEntryValue | null,
): PaidEntitlementPlan | null {
  return checkoutPlans.find((plan) => plan.plan === value)?.plan ?? null;
}

