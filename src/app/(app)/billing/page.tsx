import Link from "next/link";

import { createCheckoutSession } from "./actions";
import {
  checkoutPlans,
  checkoutReadiness,
} from "@/lib/payments/checkout";
import { createClient } from "@/lib/supabase/server";

type BillingPageProps = {
  searchParams: Promise<{ checkout?: string; error?: string }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const [query, supabase] = await Promise.all([searchParams, createClient()]);
  const { data: entitlements } = await supabase
    .from("entitlements")
    .select("plan,status,current_period_end")
    .order("created_at", { ascending: false });
  const activePlan = entitlements?.[0];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <section className="mb-8 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          Billing and entitlements
        </p>
        <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em]">
              Choose a Tank Copilot plan
            </h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Checkout is wired to Stripe only when the server secret and plan price
              IDs are present. Missing configuration keeps launch buttons disabled
              without exposing secret values.
            </p>
          </div>
          <Link className="rounded-full border border-border px-5 py-3 text-center font-medium" href="/settings">
            Settings
          </Link>
        </div>
      </section>

      {query.error ? (
        <section className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {query.error}
        </section>
      ) : null}

      {query.checkout ? (
        <section className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          Checkout {query.checkout}. Entitlement changes apply after Stripe sends a signed webhook.
        </section>
      ) : null}

      <section className="mb-6 rounded-[2rem] border border-border bg-card p-6">
        <h2 className="text-2xl font-semibold tracking-tight">Current entitlement</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {activePlan
            ? `${activePlan.plan} · ${activePlan.status}${activePlan.current_period_end ? ` · renews ${new Date(activePlan.current_period_end).toLocaleDateString()}` : ""}`
            : "No paid entitlement found. Free plan limits apply until a signed Stripe webhook activates a subscription."}
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {checkoutPlans.map((plan) => {
          const readiness = checkoutReadiness(plan.plan);

          return (
            <article className="rounded-[2rem] border border-border bg-card p-6" key={plan.plan}>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {plan.audience}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{plan.name}</h2>
              <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">
                {plan.description}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                {readiness.configured
                  ? "Stripe Checkout ready."
                  : `Not configured: ${readiness.missing.join(", ")}`}
              </p>
              <form action={createCheckoutSession} className="mt-5">
                <input name="plan" type="hidden" value={plan.plan} />
                <button
                  className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!readiness.configured}
                  type="submit"
                >
                  {readiness.configured ? "Start checkout" : "Checkout unavailable"}
                </button>
              </form>
            </article>
          );
        })}
      </section>
    </main>
  );
}

