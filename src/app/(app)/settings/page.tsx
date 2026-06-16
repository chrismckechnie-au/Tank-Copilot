import { hasPublicSupabaseConfig } from "@/lib/env";

export default async function SettingsPage() {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

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

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Data export</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Tank-level CSV/JSON exports are available from each tank&apos;s Trends
            page. Full account export will package profile, tanks, tests, livestock,
            tasks, observations, and private reports through an owner-authorized
            server route.
          </p>
        </article>

        <article className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Account deletion</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Deletion must remove hobby-owned tanks and user memberships, revoke report
            shares, and leave only legally required billing/webhook audit records.
            Business admins must transfer or close business ownership before deletion.
          </p>
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
