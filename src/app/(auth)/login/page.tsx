import { Droplets, KeyRound } from "lucide-react";

import { hasPublicSupabaseConfig } from "@/lib/env";
import { signInWithGoogle, signInWithMagicLink } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    sent?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next ?? "/dashboard";
  const missingSupabase = !hasPublicSupabaseConfig();

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <section>
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.24em] text-primary">
          Auth-first onboarding
        </p>
        <h1 className="font-heading text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">
          Start with a safer tank record.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
          Tank Copilot keeps advice tied to your own tank context, water source,
          equipment baseline, and test history.
        </p>
      </section>

      <section className="rounded-[2rem] border border-border bg-card/80 p-6 shadow-xl shadow-primary/10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
            <KeyRound aria-hidden className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">Magic link or Google OAuth</p>
          </div>
        </div>

        {missingSupabase ? (
          <div className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Supabase anon key is not configured yet. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
            to `.env.local` and Vercel before testing live auth.
          </div>
        ) : null}

        {params.sent ? (
          <div className="mb-5 rounded-2xl border border-primary/20 bg-secondary p-4 text-sm">
            Check your email for the sign-in link.
          </div>
        ) : null}

        {params.error ? (
          <div className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Sign-in failed. Check configuration and try again.
          </div>
        ) : null}

        <form action={signInWithMagicLink} className="grid gap-4">
          <input name="next" type="hidden" value={next} />
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              className="h-12 rounded-2xl border border-input bg-background px-4 outline-none ring-ring/30 transition focus:ring-4"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </label>
          <button
            className="rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/15"
            disabled={missingSupabase}
            type="submit"
          >
            Send magic link
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form action={signInWithGoogle}>
          <input name="next" type="hidden" value={next} />
          <button
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-3 font-medium"
            disabled={missingSupabase}
            type="submit"
          >
            <Droplets aria-hidden className="size-4" />
            Continue with Google
          </button>
        </form>
      </section>
    </main>
  );
}
