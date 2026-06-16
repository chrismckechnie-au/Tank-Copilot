export const entitlementPlans = [
  "free",
  "hobby_pro",
  "reef_pro",
  "service_pro",
  "lfs",
] as const;

export const entitlementStatuses = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
] as const;

export type EntitlementPlan = (typeof entitlementPlans)[number];
export type EntitlementStatus = (typeof entitlementStatuses)[number];
export type PaidEntitlementPlan = Exclude<EntitlementPlan, "free">;

export const priceEnvByPlan: Record<PaidEntitlementPlan, string> = {
  hobby_pro: "STRIPE_PRICE_HOBBY_PRO",
  reef_pro: "STRIPE_PRICE_REEF_PRO",
  service_pro: "STRIPE_PRICE_SERVICE_PRO",
  lfs: "STRIPE_PRICE_LFS",
};

export function planFromStripePriceId(
  priceId: string | null | undefined,
): PaidEntitlementPlan | null {
  if (!priceId) {
    return null;
  }

  for (const [plan, envName] of Object.entries(priceEnvByPlan)) {
    if (process.env[envName] === priceId) {
      return plan as PaidEntitlementPlan;
    }
  }

  return null;
}

export function isActiveEntitlementStatus(status: string): status is "active" | "trialing" {
  return status === "active" || status === "trialing";
}

export function isKnownEntitlementStatus(status: string): status is EntitlementStatus {
  return entitlementStatuses.some((knownStatus) => knownStatus === status);
}
