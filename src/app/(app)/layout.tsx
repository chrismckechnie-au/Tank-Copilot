import Link from "next/link";
import { redirect } from "next/navigation";
import { type ReactNode } from "react";

import { signOut } from "./actions";
import { hasPublicSupabaseConfig, isCommercialModeEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!hasPublicSupabaseConfig()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
        <section className="rounded-[2rem] border border-border bg-card p-8 shadow-xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
            Configuration needed
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.04em]">
            Supabase browser auth is not configured.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` and Vercel before
            testing protected app routes.
          </p>
          <Link className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-primary-foreground" href="/">
            Back to foundation shell
          </Link>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link className="font-heading text-2xl font-semibold tracking-[-0.04em]" href="/dashboard">
            Tank Copilot
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard">Dashboard</Link>
            {isCommercialModeEnabled() ? <Link href="/businesses">Business</Link> : null}
            <Link href="/tanks/new">New tank</Link>
            <Link href="/billing">Billing</Link>
            <Link href="/settings">Settings</Link>
            <form action={signOut}>
              <button className="rounded-full border border-border px-4 py-2" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}
