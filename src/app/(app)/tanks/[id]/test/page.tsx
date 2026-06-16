import { notFound } from "next/navigation";

import { logWaterTest } from "../../actions";
import { hasPublicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type WaterTestPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function WaterTestPage({ params, searchParams }: WaterTestPageProps) {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: tank } = await supabase
    .from("tanks")
    .select("id,name,type")
    .eq("id", id)
    .single();

  if (!tank) {
    notFound();
  }

  const isReef = tank.type === "reef";

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          Water test
        </p>
        <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em]">
          Log readings for {tank.name}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Critical fields are required so the product never stores a test that cannot produce
          a safety result.
        </p>

        {error ? (
          <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <form action={logWaterTest} className="mt-8 grid gap-5" encType="multipart/form-data">
          <input name="tankId" type="hidden" value={tank.id} />
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField label="Ammonia (ppm)" name="ammonia" required />
            <NumberField label="Nitrite (ppm)" name="nitrite" required />
            <NumberField label="Nitrate (ppm)" name="nitrate" required />
            <NumberField label="pH" name="ph" required />
            <NumberField label="Temperature (C)" name="tempC" required />
            <NumberField label="Salinity (ppt)" name="salinityPpt" required={isReef} />
            <NumberField label="Alkalinity (dKH)" name="alkalinityDkh" required={isReef} />
            <NumberField label="GH" name="gh" />
            <NumberField label="Phosphate (ppm)" name="phosphate" />
            <NumberField label="Calcium (ppm)" name="calcium" />
            <NumberField label="Magnesium (ppm)" name="magnesium" />
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Notes
            <textarea className="min-h-28 rounded-2xl border border-input bg-background p-4" name="notes" placeholder="Optional; never sent to AI in MVP prompts." />
          </label>
          <label className="grid gap-2 text-sm font-medium">
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
          <button className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground" type="submit">
            Save water test
          </button>
        </form>
      </section>
    </main>
  );
}

function NumberField({
  label,
  name,
  required = false,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="h-12 rounded-2xl border border-input bg-background px-4"
        inputMode="decimal"
        min="0"
        name={name}
        required={required}
        step="0.001"
        type="number"
      />
    </label>
  );
}
