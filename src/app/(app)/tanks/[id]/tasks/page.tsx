import Link from "next/link";
import { notFound } from "next/navigation";

import {
  completeMaintenanceTask,
  createMaintenanceTask,
  rescheduleMaintenanceTask,
} from "../../actions";
import { hasPublicSupabaseConfig } from "@/lib/env";
import { maintenanceCategories } from "@/lib/maintenance/validation";
import { createClient } from "@/lib/supabase/server";

type TasksPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

const categoryLabels: Record<(typeof maintenanceCategories)[number], string> = {
  water_change: "Water change",
  water_test: "Water test",
  filter: "Filter / flow",
  dosing: "Dosing review",
  equipment: "Equipment",
  livestock: "Livestock",
  other: "Other",
};

export default async function TasksPage({ params, searchParams }: TasksPageProps) {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: tank } = await supabase
    .from("tanks")
    .select("id,name,type,volume_liters")
    .eq("id", id)
    .single();

  if (!tank) {
    notFound();
  }

  const { data: tasks } = await supabase
    .from("maintenance_tasks")
    .select("id,title,category,cadence_days,last_completed_on,next_due_on,reminder_enabled")
    .eq("tank_id", tank.id)
    .order("next_due_on", { ascending: true });

  const today = todayIsoDate();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <section className="mb-6 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          Maintenance · {tank.type.toUpperCase()} · {tank.volume_liters} L
        </p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em]">
              Tasks for {tank.name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Recurring maintenance stays deterministic: complete once, Tank Copilot
              reschedules from the cadence and queues email reminders separately.
            </p>
          </div>
          <Link className="rounded-full border border-border px-5 py-3 text-center font-medium" href={`/tanks/${tank.id}`}>
            Back to tank
          </Link>
        </div>
      </section>

      {query.error ? (
        <section className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {query.error}
        </section>
      ) : null}

      {query.saved ? (
        <section className="mb-6 rounded-2xl border border-primary/20 bg-secondary p-4 text-sm">
          Task updated. Reminder retries are handled by the server-side delivery queue.
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form action={createMaintenanceTask} className="rounded-[2rem] border border-border bg-card p-6">
          <input name="tankId" type="hidden" value={tank.id} />
          <h2 className="text-2xl font-semibold tracking-tight">Add recurring task</h2>

          <label className="mt-5 grid gap-2 text-sm font-medium">
            Task name
            <input
              className="h-12 rounded-2xl border border-input bg-background px-4"
              maxLength={120}
              name="title"
              placeholder="e.g. Clean pre-filter sponge"
              required
            />
          </label>

          <label className="mt-5 grid gap-2 text-sm font-medium">
            Category
            <select className="h-12 rounded-2xl border border-input bg-background px-4" name="category">
              {maintenanceCategories.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Cadence days
              <input
                className="h-12 rounded-2xl border border-input bg-background px-4"
                max={365}
                min={1}
                name="cadenceDays"
                required
                type="number"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Next due
              <input
                className="h-12 rounded-2xl border border-input bg-background px-4"
                defaultValue={today}
                name="nextDueOn"
                type="date"
              />
            </label>
          </div>

          <label className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-background p-3 text-sm">
            <input defaultChecked name="reminderEnabled" type="checkbox" />
            Email reminder when due
          </label>

          <button className="mt-6 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground" type="submit">
            Add task
          </button>
        </form>

        <section className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Due schedule</h2>
          {tasks && tasks.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {tasks.map((task) => (
                <article className="rounded-2xl border border-border bg-background p-4" key={task.id}>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {categoryLabels[task.category]} · every {task.cadence_days} days
                      </p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight">{task.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Next due {formatDueDate(task.next_due_on, today)}
                        {task.last_completed_on ? ` · last done ${task.last_completed_on}` : ""}
                      </p>
                    </div>
                    <span className={statusClassName(task.next_due_on, today)}>
                      {statusLabel(task.next_due_on, today)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
                    <form action={completeMaintenanceTask}>
                      <input name="tankId" type="hidden" value={tank.id} />
                      <input name="taskId" type="hidden" value={task.id} />
                      <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground" type="submit">
                        Complete today
                      </button>
                    </form>

                    <form action={rescheduleMaintenanceTask} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                      <input name="tankId" type="hidden" value={tank.id} />
                      <input name="taskId" type="hidden" value={task.id} />
                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Reschedule
                        <input
                          className="h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground"
                          defaultValue={task.next_due_on}
                          name="nextDueOn"
                          type="date"
                        />
                      </label>
                      <button className="rounded-full border border-border px-4 py-2.5 text-sm font-medium" type="submit">
                        Save date
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No tasks yet. New tanks get starter cadences after the Phase 4 migration is applied.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDueDate(nextDueOn: string, today: string) {
  if (nextDueOn === today) {
    return "today";
  }

  return nextDueOn;
}

function statusLabel(nextDueOn: string, today: string) {
  if (nextDueOn < today) {
    return "Overdue";
  }

  if (nextDueOn === today) {
    return "Due today";
  }

  return "Upcoming";
}

function statusClassName(nextDueOn: string, today: string) {
  const base = "rounded-full px-3 py-1 font-mono text-xs uppercase tracking-[0.18em]";

  if (nextDueOn < today) {
    return `${base} bg-destructive/10 text-destructive`;
  }

  if (nextDueOn === today) {
    return `${base} bg-primary/10 text-primary`;
  }

  return `${base} bg-secondary text-secondary-foreground`;
}
