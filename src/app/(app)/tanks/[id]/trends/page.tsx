import Link from "next/link";
import { notFound } from "next/navigation";

import { hasPublicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { summarizeWaterTrends } from "@/lib/trends/water-tests";

type TrendsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrendsPage({ params }: TrendsPageProps) {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: tank } = await supabase
    .from("tanks")
    .select("id,name,type,volume_liters")
    .eq("id", id)
    .single();

  if (!tank) {
    notFound();
  }

  const { data: tests } = await supabase
    .from("water_tests")
    .select("tested_at,ammonia,nitrite,nitrate,ph,temp_c,salinity,kh,phosphate,calcium,magnesium")
    .eq("tank_id", tank.id)
    .order("tested_at", { ascending: false })
    .limit(30);
  const metrics = summarizeWaterTrends(tests ?? []);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <section className="mb-6 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          Trends · {tank.type.toUpperCase()} · {tank.volume_liters} L
        </p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em]">
              Water history for {tank.name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Trend flags are context only. They highlight movement for review, not
              dosing or corrective action.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-full border border-border px-5 py-3 text-center font-medium" href={`/tanks/${tank.id}/export?format=json`}>
              Export JSON
            </Link>
            <Link className="rounded-full border border-border px-5 py-3 text-center font-medium" href={`/tanks/${tank.id}/export?format=csv`}>
              Export CSV
            </Link>
          </div>
        </div>
      </section>

      {tests && tests.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {metrics.map((metric) => (
            <article className="rounded-2xl border border-border bg-card p-5" key={metric.key}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {metric.latest ?? "n/a"}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs uppercase tracking-[0.18em]">
                  {metric.direction}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Previous: {metric.previous ?? "n/a"} · Delta: {metric.delta ?? "n/a"}
              </p>
              {metric.warning ? (
                <p className="mt-3 rounded-xl border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-950">
                  {metric.warning}
                </p>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-border bg-card/60 p-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">No trend data yet</h2>
          <p className="mt-3 text-muted-foreground">
            Log at least two water tests to show deltas.
          </p>
          <Link className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-primary-foreground" href={`/tanks/${tank.id}/test`}>
            Log water test
          </Link>
        </section>
      )}
    </main>
  );
}
