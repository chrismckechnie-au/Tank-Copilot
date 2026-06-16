import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addTeamMember,
  createClientRecord,
  createClientTank,
  removeTeamMember,
} from "../actions";
import { hasPublicSupabaseConfig, isCommercialModeEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type BusinessPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function BusinessPage({ params, searchParams }: BusinessPageProps) {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

  if (!isCommercialModeEnabled()) {
    notFound();
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id,name,logo_path,plan")
    .eq("id", id)
    .single();

  if (!business) {
    notFound();
  }

  const [{ data: clients }, { data: members }, { data: tanks }] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name,contact,location,notes,created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("team_members")
      .select("user_id,role,created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("tanks")
      .select("id,name,type,volume_liters,client_id,created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false }),
  ]);
  const clientNameById = new Map((clients ?? []).map((client) => [client.id, client.name]));

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <section className="mb-8 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          {business.plan} · business workspace
        </p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em]">
              {business.name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Client data, tanks, and reports remain business-scoped by RLS. Viewers
              can read; admins and editors can write.
            </p>
          </div>
          <Link className="rounded-full border border-border px-5 py-3 text-center font-medium" href="/businesses">
            All businesses
          </Link>
        </div>
      </section>

      {query.error ? (
        <section className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {query.error}
        </section>
      ) : null}
      {query.saved ? (
        <section className="mb-6 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
          {query.saved.replaceAll("-", " ")}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold tracking-tight">Clients</h2>
            {clients && clients.length > 0 ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {clients.map((client) => (
                  <article className="rounded-2xl border border-border bg-background p-4" key={client.id}>
                    <h3 className="text-xl font-semibold tracking-tight">{client.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {client.contact || "No contact"} · {client.location || "No location"}
                    </p>
                    {client.notes ? (
                      <p className="mt-2 text-sm text-muted-foreground">{client.notes}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Add a client before creating client tanks.
              </p>
            )}
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold tracking-tight">Client tanks</h2>
            {tanks && tanks.length > 0 ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {tanks.map((tank) => (
                  <article className="rounded-2xl border border-border bg-background p-4" key={tank.id}>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {clientNameById.get(tank.client_id ?? "") ?? "Unknown client"}
                    </p>
                    <Link className="mt-2 block text-xl font-semibold tracking-tight" href={`/tanks/${tank.id}`}>
                      {tank.name}
                    </Link>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {tank.type.toUpperCase()} · {tank.volume_liters} L
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No client tanks yet.
              </p>
            )}
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold tracking-tight">Team</h2>
            <div className="mt-5 grid gap-3">
              {(members ?? []).map((member) => (
                <article className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center" key={member.user_id}>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {member.role}
                    </p>
                    <p className="break-all text-sm">{member.user_id}</p>
                  </div>
                  <form action={removeTeamMember}>
                    <input name="businessId" type="hidden" value={business.id} />
                    <input name="userId" type="hidden" value={member.user_id} />
                    <button className="rounded-full border border-border px-4 py-2 text-sm" type="submit">
                      Remove
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid gap-6">
          <form action={createClientRecord} className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold tracking-tight">Add client</h2>
            <input name="businessId" type="hidden" value={business.id} />
            <label className="mt-5 grid gap-2 text-sm font-medium">
              Client name
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="name" required />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Contact
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="contact" />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Location
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="location" />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Notes
              <textarea className="min-h-24 rounded-2xl border border-input bg-background p-4" name="notes" />
            </label>
            <button className="mt-5 w-full rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground" type="submit">
              Save client
            </button>
          </form>

          <form action={createClientTank} className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold tracking-tight">Create client tank</h2>
            <input name="businessId" type="hidden" value={business.id} />
            <label className="mt-5 grid gap-2 text-sm font-medium">
              Client
              <select className="h-12 rounded-2xl border border-input bg-background px-4" name="clientId" required>
                <option value="">Choose client</option>
                {(clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Tank name
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="name" required />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Tank type
              <select className="h-12 rounded-2xl border border-input bg-background px-4" name="type" required>
                <option value="fw">Freshwater</option>
                <option value="planted">Planted</option>
                <option value="reef">Reef</option>
              </select>
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            </div>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Start date
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="startDate" type="date" />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Water source
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="waterSource" required />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Equipment category
                <select className="h-12 rounded-2xl border border-input bg-background px-4" name="equipmentCategory">
                  <option value="">Skip</option>
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
                <input className="h-12 rounded-2xl border border-input bg-background px-4" name="equipmentName" />
              </label>
            </div>
            <button className="mt-5 w-full rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground" type="submit">
              Save tank and log test
            </button>
          </form>

          <form action={addTeamMember} className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold tracking-tight">Add team member</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Pilot flow accepts an existing Supabase user UUID. Admin-only RLS and
              database triggers enforce membership invariants.
            </p>
            <input name="businessId" type="hidden" value={business.id} />
            <label className="mt-5 grid gap-2 text-sm font-medium">
              User ID
              <input className="h-12 rounded-2xl border border-input bg-background px-4" name="userId" required />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Role
              <select className="h-12 rounded-2xl border border-input bg-background px-4" name="role" required>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button className="mt-5 w-full rounded-full border border-border px-6 py-3 font-medium" type="submit">
              Add member
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}
