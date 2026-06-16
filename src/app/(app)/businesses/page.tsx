import Link from "next/link";
import { notFound } from "next/navigation";

import { createBusiness } from "./actions";
import { hasPublicSupabaseConfig, isCommercialModeEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type BusinessesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function BusinessesPage({ searchParams }: BusinessesPageProps) {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

  if (!isCommercialModeEnabled()) {
    notFound();
  }

  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id,name,plan,logo_path,created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <section className="mb-8 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          Commercial pilot
        </p>
        <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em]">
          Businesses
        </h1>
        <p className="mt-2 text-muted-foreground">
          Business records are feature-gated and protected by team-member RLS.
          Admins manage clients, team access, and client tanks.
        </p>
      </section>

      {error ? (
        <section className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Your business accounts</h2>
          {businesses && businesses.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {businesses.map((business) => (
                <article className="rounded-2xl border border-border bg-background p-4" key={business.id}>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {business.plan}
                  </p>
                  <Link className="mt-2 block text-2xl font-semibold tracking-tight" href={`/businesses/${business.id}`}>
                    {business.name}
                  </Link>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {business.logo_path ? "Logo configured for branded reports." : "No logo configured yet."}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No business accounts yet. Create one to start the commercial pilot flow.
            </p>
          )}
        </div>

        <form action={createBusiness} className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Create business</h2>
          <label className="mt-5 grid gap-2 text-sm font-medium">
            Business name
            <input className="h-12 rounded-2xl border border-input bg-background px-4" name="name" required />
          </label>
          <label className="mt-4 grid gap-2 text-sm font-medium">
            Logo URL
            <input className="h-12 rounded-2xl border border-input bg-background px-4" name="logoPath" placeholder="https://..." type="url" />
          </label>
          <button className="mt-5 w-full rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground" type="submit">
            Create pilot business
          </button>
        </form>
      </section>
    </main>
  );
}
