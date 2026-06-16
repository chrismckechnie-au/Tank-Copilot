import Link from "next/link";
import { notFound } from "next/navigation";

import { createLivestock, updateLivestockStatus } from "../../actions";
import { hasPublicSupabaseConfig } from "@/lib/env";
import { livestockStatuses } from "@/lib/livestock/validation";
import { evaluateStockingPlan } from "@/lib/stocking/planner";
import { createClient } from "@/lib/supabase/server";

type LivestockPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
    proposedSpeciesName?: string;
    proposedQuantity?: string;
    adultSizeCm?: string;
    temperament?: "peaceful" | "semi_aggressive" | "aggressive" | "unknown";
    waterFit?: "good" | "unknown" | "poor";
  }>;
};

const statusLabels: Record<(typeof livestockStatuses)[number], string> = {
  active: "Active",
  quarantine: "Quarantine",
  planned: "Planned",
  removed: "Removed",
  deceased: "Deceased",
};

export default async function LivestockPage({ params, searchParams }: LivestockPageProps) {
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

  const { data: livestock } = await supabase
    .from("livestock")
    .select("id,species_name,common_name,quantity,added_at,status,notes,created_at")
    .eq("tank_id", tank.id)
    .order("created_at", { ascending: false });
  const activeCount = (livestock ?? [])
    .filter((item) => item.status === "active" || item.status === "quarantine")
    .reduce((sum, item) => sum + item.quantity, 0);
  const plannerResult = plannerFromQuery(query, {
    tankType: tank.type,
    volumeLiters: tank.volume_liters,
    currentLivestockCount: activeCount,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <section className="mb-6 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          Livestock · {tank.type.toUpperCase()} · {tank.volume_liters} L
        </p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em]">
              Livestock for {tank.name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Track current animals and run warning-only stocking checks before changes.
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
          Livestock updated.
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-6">
          <form action={createLivestock} className="rounded-[2rem] border border-border bg-card p-6">
            <input name="tankId" type="hidden" value={tank.id} />
            <h2 className="text-2xl font-semibold tracking-tight">Add livestock</h2>
            <label className="mt-5 grid gap-2 text-sm font-medium">
              Species name
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="speciesName" required />
            </label>
            <label className="mt-5 grid gap-2 text-sm font-medium">
              Common name
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="commonName" />
            </label>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Quantity
                <input className="h-12 rounded-2xl border border-input bg-background px-4" min={1} name="quantity" required type="number" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Added at
                <input className="h-12 rounded-2xl border border-input bg-background px-4" name="addedAt" type="date" />
              </label>
            </div>
            <label className="mt-5 grid gap-2 text-sm font-medium">
              Status
              <select className="h-12 rounded-2xl border border-input bg-background px-4" name="status">
                {livestockStatuses.map((status) => (
                  <option key={status} value={status}>{statusLabels[status]}</option>
                ))}
              </select>
            </label>
            <label className="mt-5 grid gap-2 text-sm font-medium">
              Notes
              <textarea className="min-h-24 rounded-2xl border border-input bg-background p-4" name="notes" />
            </label>
            <button className="mt-6 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground" type="submit">
              Add livestock
            </button>
          </form>

          <form className="rounded-[2rem] border border-border bg-card p-6" method="get">
            <h2 className="text-2xl font-semibold tracking-tight">Stocking planner v0</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Warning-only. It cannot declare species compatible.
            </p>
            <label className="mt-5 grid gap-2 text-sm font-medium">
              Proposed species
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="proposedSpeciesName" />
            </label>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Quantity
                <input className="h-12 rounded-2xl border border-input bg-background px-4" min={1} name="proposedQuantity" type="number" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Adult size cm
                <input className="h-12 rounded-2xl border border-input bg-background px-4" min={0} name="adultSizeCm" step="0.1" type="number" />
              </label>
            </div>
            <label className="mt-5 grid gap-2 text-sm font-medium">
              Temperament
              <select className="h-12 rounded-2xl border border-input bg-background px-4" name="temperament">
                <option value="unknown">Unknown</option>
                <option value="peaceful">Peaceful</option>
                <option value="semi_aggressive">Semi-aggressive</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </label>
            <label className="mt-5 grid gap-2 text-sm font-medium">
              Water fit
              <select className="h-12 rounded-2xl border border-input bg-background px-4" name="waterFit">
                <option value="unknown">Unknown</option>
                <option value="good">Sourced fit looks good</option>
                <option value="poor">Potential mismatch</option>
              </select>
            </label>
            <button className="mt-6 rounded-full border border-border px-6 py-3 font-medium" type="submit">
              Check warnings
            </button>
          </form>
        </div>

        <section className="grid gap-6">
          {plannerResult ? (
            <article className="rounded-[2rem] border border-amber-300/50 bg-amber-50 p-6 text-amber-950">
              <p className="font-mono text-xs uppercase tracking-[0.2em]">Planner result · {plannerResult.confidence} confidence</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Warnings to review</h2>
              <ul className="mt-4 grid gap-2 text-sm">
                {plannerResult.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
              <h3 className="mt-5 font-semibold">Safer alternatives</h3>
              <ul className="mt-2 grid gap-2 text-sm">
                {plannerResult.saferAlternatives.map((alternative) => <li key={alternative}>{alternative}</li>)}
              </ul>
            </article>
          ) : null}

          <section className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold tracking-tight">Current list</h2>
            {livestock && livestock.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {livestock.map((item) => (
                  <article className="rounded-2xl border border-border bg-background p-4" key={item.id}>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {statusLabels[item.status]} · quantity {item.quantity}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight">{item.common_name || item.species_name}</h3>
                    <p className="mt-1 text-sm italic text-muted-foreground">{item.species_name}</p>
                    {item.notes ? <p className="mt-3 text-sm text-muted-foreground">{item.notes}</p> : null}
                    <form action={updateLivestockStatus} className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <input name="tankId" type="hidden" value={tank.id} />
                      <input name="livestockId" type="hidden" value={item.id} />
                      <select className="h-10 rounded-xl border border-input bg-card px-3 text-sm" name="status" defaultValue={item.status}>
                        {livestockStatuses.map((status) => (
                          <option key={status} value={status}>{statusLabels[status]}</option>
                        ))}
                      </select>
                      <button className="rounded-full border border-border px-4 py-2 text-sm font-medium" type="submit">
                        Update status
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No livestock rows yet.
              </p>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}

function plannerFromQuery(
  query: Awaited<LivestockPageProps["searchParams"]>,
  tank: { tankType: "fw" | "planted" | "reef"; volumeLiters: number; currentLivestockCount: number },
) {
  if (!query.proposedSpeciesName || !query.proposedQuantity) {
    return null;
  }

  const proposedQuantity = Number(query.proposedQuantity);
  const adultSize = query.adultSizeCm ? Number(query.adultSizeCm) : null;
  if (!Number.isFinite(proposedQuantity) || proposedQuantity < 1) {
    return null;
  }

  return evaluateStockingPlan({
    tankType: tank.tankType,
    volumeLiters: tank.volumeLiters,
    currentLivestockCount: tank.currentLivestockCount,
    proposedSpeciesName: query.proposedSpeciesName,
    proposedQuantity,
    adultSizeCm: adultSize !== null && Number.isFinite(adultSize) ? adultSize : null,
    temperament: query.temperament ?? "unknown",
    waterFit: query.waterFit ?? "unknown",
  });
}
