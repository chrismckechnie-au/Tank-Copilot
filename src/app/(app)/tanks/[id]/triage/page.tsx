import Link from "next/link";
import { notFound } from "next/navigation";

import { logObservation } from "../../actions";
import { hasPublicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { symptomOptions } from "@/lib/triage/validation";

type TriagePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

const symptomLabels: Record<(typeof symptomOptions)[number], string> = {
  gasping: "Gasping / at surface",
  lethargy: "Lethargy",
  not_eating: "Not eating",
  spots_or_lesions: "Spots or lesions",
  clamped_fins: "Clamped fins",
  flashing_or_scratching: "Flashing / scratching",
  rapid_breathing: "Rapid breathing",
  coral_retracted: "Coral retracted",
  algae_bloom: "Algae bloom",
  cloudy_water: "Cloudy water",
};

export default async function TriagePage({ params, searchParams }: TriagePageProps) {
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

  const { data: observations } = await supabase
    .from("observations")
    .select("id,created_at,symptoms,affected_livestock,recent_changes,photo_paths,follow_up_prompts")
    .eq("tank_id", tank.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="mb-6 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          Symptom triage · {tank.type.toUpperCase()} · {tank.volume_liters} L
        </p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em]">
              Observation intake for {tank.name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Structured context only. Tank Copilot does not diagnose, dose, or issue
              actions from observations in Phase 3.
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
          Observation saved. Use the follow-up prompts to gather safer context before any reviewer interprets it.
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form
          action={logObservation}
          className="rounded-[2rem] border border-border bg-card p-6"
          encType="multipart/form-data"
        >
          <input name="tankId" type="hidden" value={tank.id} />
          <h2 className="text-2xl font-semibold tracking-tight">What are you seeing?</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {symptomOptions.map((symptom) => (
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 text-sm" key={symptom}>
                <input name="symptoms" type="checkbox" value={symptom} />
                {symptomLabels[symptom]}
              </label>
            ))}
          </div>

          <label className="mt-5 grid gap-2 text-sm font-medium">
            Affected livestock or coral
            <input
              className="h-12 rounded-2xl border border-input bg-background px-4"
              name="affectedLivestock"
              placeholder="Optional; e.g. two clownfish, one acan colony"
            />
          </label>

          <label className="mt-5 grid gap-2 text-sm font-medium">
            Recent changes
            <textarea
              className="min-h-28 rounded-2xl border border-input bg-background p-4"
              name="recentChanges"
              placeholder="Water change, new livestock, equipment change, missed maintenance, feeding, source water..."
            />
          </label>

          <label className="mt-5 grid gap-2 text-sm font-medium">
            Optional photo
            <input
              accept="image/jpeg,image/png,image/webp"
              className="rounded-2xl border border-input bg-background px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-secondary-foreground"
              name="photo"
              type="file"
            />
            <span className="text-xs text-muted-foreground">
              JPEG, PNG, or WebP up to 5 MB. Photos are re-encoded to strip metadata before private storage.
            </span>
          </label>

          <button className="mt-6 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground" type="submit">
            Save observation
          </button>
        </form>

        <section className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Recent observations</h2>
          {observations && observations.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {observations.map((observation) => (
                <article className="rounded-2xl border border-border bg-background p-4" key={observation.id}>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {new Date(observation.created_at).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Symptoms: {formatList(observation.symptoms)}
                  </p>
                  {observation.affected_livestock ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Affected: {observation.affected_livestock}
                    </p>
                  ) : null}
                  {observation.photo_paths.length > 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">Photo attached</p>
                  ) : null}
                  <div className="mt-3 rounded-xl bg-card p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Follow-up prompts</p>
                    <ul className="mt-2 grid gap-1">
                      {formatPrompts(observation.follow_up_prompts).map((prompt) => (
                        <li key={prompt}>{prompt}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No observations yet. Save one to build report context later.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

function formatList(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return "none";
  }

  return value.filter((item): item is string => typeof item === "string").join(", ");
}

function formatPrompts(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}
