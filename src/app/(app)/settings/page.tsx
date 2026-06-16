import Link from "next/link";

import { deleteAccount } from "./actions";
import { hasPublicSupabaseConfig } from "@/lib/env";

type SettingsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="mb-8 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          Privacy and launch readiness
        </p>
        <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em]">
          Account settings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Phase 6 makes the health-data boundaries visible before payment launch.
          Export and deletion controls are documented here until live account actions
          are wired to production-reviewed RPCs.
        </p>
      </section>

      {error ? (
        <section className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </section>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Data export</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Tank-level CSV/JSON exports are available from each tank&apos;s Trends
            page. Full account export will package profile, tanks, tests, livestock,
            tasks, observations, and private reports through an owner-authorized
            server route.
          </p>
          <Link
            className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            href="/settings/export"
          >
            Download account JSON
          </Link>
        </article>

        <article className="rounded-[2rem] border border-destructive/20 bg-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Account deletion</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Deletion must remove hobby-owned tanks and user memberships, revoke report
            shares, and leave only legally required billing/webhook audit records.
            Business admins must transfer or close business ownership before deletion.
          </p>
          <form action={deleteAccount} className="mt-5 grid gap-3">
            <label className="grid gap-2 text-sm font-medium">
              Confirmation phrase
              <input
                className="h-12 rounded-2xl border border-input bg-background px-4"
                name="confirmation"
                placeholder="DELETE MY ACCOUNT"
              />
            </label>
            <button className="rounded-full border border-destructive/40 px-5 py-3 text-sm font-medium text-destructive" type="submit">
              Permanently delete account
            </button>
          </form>
        </article>

        <article className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Retention boundary</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Aquarium health records are treated as private operational data. Public
            report links are opt-in, revocable, noindex, and served only through the
            sanitized share route.
          </p>
        </article>

        <article className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Recommendations transparency</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Product or affiliate recommendations must be labeled as commercial
            recommendations and kept separate from deterministic safety rules. Rules
            cannot be changed by sponsorship or affiliate status.
          </p>
        </article>
      </section>
    </main>
  );
}
