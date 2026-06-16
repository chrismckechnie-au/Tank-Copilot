import Link from "next/link";
import { notFound } from "next/navigation";

import { hasPublicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type TankPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TankPage({ params }: TankPageProps) {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: tank } = await supabase
    .from("tanks")
    .select("id,name,type,volume_liters,water_source,created_at")
    .eq("id", id)
    .single();

  if (!tank) {
    notFound();
  }

  const { data: tests } = await supabase
    .from("water_tests")
    .select("id,tested_at,ammonia,nitrite,nitrate,ph,temp_c,salinity,kh")
    .eq("tank_id", tank.id)
    .order("tested_at", { ascending: false })
    .limit(10);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="mb-6 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          {tank.type.toUpperCase()} · {tank.volume_liters} L
        </p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em]">{tank.name}</h1>
            <p className="mt-2 text-muted-foreground">Water source: {tank.water_source}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-full bg-primary px-5 py-3 text-center font-medium text-primary-foreground" href={`/tanks/${tank.id}/test`}>
              Log water test
            </Link>
            <Link className="rounded-full border border-border px-5 py-3 text-center font-medium" href={`/tanks/${tank.id}/results`}>
              View latest result
            </Link>
            <Link className="rounded-full border border-border px-5 py-3 text-center font-medium" href={`/tanks/${tank.id}/triage`}>
              Add observation
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <h2 className="text-2xl font-semibold tracking-tight">Water-test history</h2>
        {tests && tests.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {tests.map((test) => (
              <article className="rounded-2xl border border-border bg-background p-4" key={test.id}>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {new Date(test.tested_at).toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  NH3 {test.ammonia ?? "n/a"} · NO2 {test.nitrite ?? "n/a"} · NO3{" "}
                  {test.nitrate ?? "n/a"} · pH {test.ph ?? "n/a"} · Temp{" "}
                  {test.temp_c ?? "n/a"} C
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground">
            No tests yet. Log a complete first test so the rules engine can evaluate risk in Phase 2.
          </p>
        )}
      </section>
    </main>
  );
}
