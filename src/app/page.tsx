import { Activity, Database, FlaskConical, LockKeyhole, ShieldCheck } from "lucide-react";

const foundationItems = [
  {
    icon: Database,
    label: "Supabase foundation",
    detail: "Profiles migration, RLS-first posture, and server-only admin client.",
  },
  {
    icon: ShieldCheck,
    label: "Safety-first rules track",
    detail: "Rules v0 stays unsigned until reviewer evidence is recorded.",
  },
  {
    icon: LockKeyhole,
    label: "Secret-safe setup",
    detail: "Service-role credentials stay out of browser bundles and commits.",
  },
  {
    icon: FlaskConical,
    label: "Test harness online",
    detail: "Vitest, Playwright, ESLint, and TypeScript checks are wired.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-14">
      <nav className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Activity aria-hidden className="size-5" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Tank Copilot</p>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Phase 0 foundation
            </p>
          </div>
        </div>
        <a
          className="hidden rounded-full border border-border bg-card/75 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground shadow-sm backdrop-blur sm:block"
          href="/health"
        >
          Health check
        </a>
      </nav>

      <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.06fr_0.94fr] lg:py-20">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex rounded-full border border-primary/15 bg-card/70 px-4 py-2 font-mono text-xs uppercase tracking-[0.24em] text-primary shadow-sm backdrop-blur">
            Deterministic safety first
          </p>
          <h1 className="font-heading text-balance text-5xl font-semibold leading-[0.93] tracking-[-0.06em] text-foreground sm:text-7xl lg:text-8xl">
            Aquarium triage that refuses to guess.
          </h1>
          <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
            Tank Copilot turns water-test data, tank history, and symptoms into safe next
            actions and shareable reports. This shell proves the Phase 0 foundation is
            online before user-facing advice ships.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              className="rounded-full bg-primary px-6 py-3 text-center font-medium text-primary-foreground shadow-xl shadow-primary/20 transition hover:translate-y-[-1px]"
              href="/health"
            >
              Check app health
            </a>
            <a
              className="rounded-full border border-border bg-card/80 px-6 py-3 text-center font-medium text-foreground shadow-sm backdrop-blur transition hover:translate-y-[-1px]"
              href="https://github.com/chrismckechnie-au/Tank-Copilot"
            >
              GitHub repository
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card/75 p-4 shadow-2xl shadow-primary/10 backdrop-blur">
          <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Current slice
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Foundation checklist
                </h2>
              </div>
              <div className="rounded-full bg-accent px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground">
                PWA
              </div>
            </div>
            <div className="grid gap-3">
              {foundationItems.map((item) => (
                <article
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                  key={item.label}
                >
                  <div className="flex gap-3">
                    <div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                      <item.icon aria-hidden className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold tracking-tight">{item.label}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
