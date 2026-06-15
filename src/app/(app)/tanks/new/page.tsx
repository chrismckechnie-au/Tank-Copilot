import { createTank } from "../actions";

type NewTankPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewTankPage({ searchParams }: NewTankPageProps) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          First tank in under 90 seconds
        </p>
        <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em]">
          Create tank profile
        </h1>
        <p className="mt-3 text-muted-foreground">
          Capture enough context for safe recommendations later: tank type, volume,
          age, water source, and equipment baseline.
        </p>

        {error ? (
          <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <form action={createTank} className="mt-8 grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Tank name
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="name" required />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Tank type
              <select className="h-12 rounded-2xl border border-input bg-background px-4" name="type" required>
                <option value="fw">Freshwater</option>
                <option value="planted">Planted</option>
                <option value="reef">Reef</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Volume
              <input className="h-12 rounded-2xl border border-input bg-background px-4" inputMode="decimal" min="0" name="volume" required type="number" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Units
              <select className="h-12 rounded-2xl border border-input bg-background px-4" name="unitSystem">
                <option value="metric">Liters</option>
                <option value="imperial">Gallons</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Start date
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="startDate" type="date" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Water source
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="waterSource" placeholder="Tap, RODI, mixed saltwater..." required />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Equipment category
              <select className="h-12 rounded-2xl border border-input bg-background px-4" name="equipmentCategory">
                <option value="">Skip for now</option>
                <option value="heater">Heater</option>
                <option value="filter">Filter</option>
                <option value="light">Light</option>
                <option value="skimmer">Skimmer</option>
                <option value="media">Media</option>
                <option value="pump">Pump</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Equipment name
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="equipmentName" placeholder="Optional" />
            </label>
          </div>
          <button className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground" type="submit">
            Save tank and log first test
          </button>
        </form>
      </section>
    </main>
  );
}
