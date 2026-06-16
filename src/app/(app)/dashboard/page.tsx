import Link from "next/link";

import { hasPublicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

  const supabase = await createClient();
  const { data: tanks } = await supabase
    .from("tanks")
    .select("id,name,type,volume_liters,unit_system,water_source,created_at")
    .order("created_at", { ascending: false });

  const tankIds = tanks?.map((tank) => tank.id) ?? [];
  const { data: latestWaterTests } = tankIds.length
    ? await supabase
        .from("water_tests")
        .select("tank_id,tested_at,ammonia,nitrite,nitrate,ph,temp_c,salinity,kh,photo_path")
        .in("tank_id", tankIds)
        .order("tested_at", { ascending: false })
    : { data: [] };

  const latestWaterTestByTank = new Map(
    (latestWaterTests ?? [])
      .filter((test, index, tests) => tests.findIndex((item) => item.tank_id === test.tank_id) === index)
      .map((test) => [test.tank_id, test]),
  );
  const today = new Date().toISOString().slice(0, 10);
  const { data: dueTasks } = tankIds.length
    ? await supabase
        .from("maintenance_tasks")
        .select("tank_id,title,next_due_on")
        .in("tank_id", tankIds)
        .lte("next_due_on", today)
        .order("next_due_on", { ascending: true })
    : { data: [] };
  const dueTaskCountByTank = new Map<string, number>();
  for (const task of dueTasks ?? []) {
    dueTaskCountByTank.set(task.tank_id, (dueTaskCountByTank.get(task.tank_id) ?? 0) + 1);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <section className="mb-8 flex flex-col justify-between gap-5 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10 sm:flex-row sm:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
            Dashboard
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em]">
            Your tanks
          </h1>
          <p className="mt-2 text-muted-foreground">
            Add a tank, log a complete first water test, then Phase 2 rules can produce
            a signed safety result.
          </p>
        </div>
        <Link className="rounded-full bg-primary px-5 py-3 text-center font-medium text-primary-foreground" href="/tanks/new">
          Add tank
        </Link>
      </section>

      {tanks && tanks.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {tanks.map((tank) => {
            const latestTest = latestWaterTestByTank.get(tank.id);
            const dueTaskCount = dueTaskCountByTank.get(tank.id) ?? 0;

            return (
              <article
                className="rounded-[1.5rem] border border-border bg-card/80 p-5 shadow-sm transition hover:translate-y-[-1px]"
                key={tank.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link className="text-2xl font-semibold tracking-tight" href={`/tanks/${tank.id}`}>
                      {tank.name}
                    </Link>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {tank.type.toUpperCase()} · {tank.volume_liters} L · {tank.water_source}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs uppercase tracking-[0.18em]">
                    {latestTest ? "View state" : "Log test"}
                  </span>
                </div>

                {latestTest ? (
                  <div className="mt-5 rounded-2xl bg-background p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Latest test · {new Date(latestTest.tested_at).toLocaleDateString()}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      NH3 {latestTest.ammonia ?? "n/a"} · NO2{" "}
                      {latestTest.nitrite ?? "n/a"} · NO3 {latestTest.nitrate ?? "n/a"} · pH{" "}
                      {latestTest.ph ?? "n/a"} · Temp {latestTest.temp_c ?? "n/a"} C
                    </p>
                    {latestTest.salinity !== null || latestTest.kh !== null ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Salinity {latestTest.salinity ?? "n/a"} · KH {latestTest.kh ?? "n/a"}
                      </p>
                    ) : null}
                    {latestTest.photo_path ? (
                      <p className="mt-2 text-xs text-muted-foreground">Photo attached</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl bg-background p-4 text-sm text-muted-foreground">
                    No water tests yet. Log a complete first test to unlock the Phase 2
                    safety result path.
                  </p>
                )}

                {dueTaskCount > 0 ? (
                  <Link
                    className="mt-3 block rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary"
                    href={`/tanks/${tank.id}/tasks`}
                  >
                    {dueTaskCount} maintenance task{dueTaskCount === 1 ? "" : "s"} due.
                    Open tasks to complete or reschedule.
                  </Link>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-border bg-card/60 p-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Create your first tank</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            The first-value path is explicit: tank context first, then a complete water
            test. Empty dashboards should drive users straight to that action.
          </p>
          <Link className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-primary-foreground" href="/tanks/new">
            Start tank profile
          </Link>
        </section>
      )}
    </main>
  );
}
