import Link from "next/link";
import { notFound } from "next/navigation";

import {
  enableReportShare,
  generateReport,
  revokeReportShare,
} from "./actions";
import { hasPublicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type ReportsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; report?: string }>;
};

export default async function ReportsPage({ params, searchParams }: ReportsPageProps) {
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

  const [{ data: latestTests }, { data: reports }] = await Promise.all([
    supabase
      .from("water_tests")
      .select("id,tested_at")
      .eq("tank_id", tank.id)
      .order("tested_at", { ascending: false })
      .limit(1),
    supabase
      .from("reports")
      .select(
        "id,generated_at,type,share_id,share_enabled,share_expires_at,sanitized_public_content",
      )
      .eq("tank_id", tank.id)
      .order("generated_at", { ascending: false })
      .limit(5),
  ]);
  const latestTest = latestTests?.[0];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="mb-6 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          Reports · {tank.type.toUpperCase()} · {tank.volume_liters} L
        </p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em]">
              Reports for {tank.name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Deterministic report generation only. Public links expose `PublicReportV1`
              sanitized content by exact token and noindex response.
            </p>
          </div>
          <Link className="rounded-full border border-border px-5 py-3 text-center font-medium" href={`/tanks/${tank.id}`}>
            Back to tank
          </Link>
        </div>
      </section>

      <section className="mb-6 rounded-[2rem] border border-amber-300/50 bg-amber-50 p-5 text-amber-950">
        <p className="font-mono text-xs uppercase tracking-[0.22em]">Rules under expert review</p>
        <p className="mt-2 text-sm leading-6">
          Reports generated before reviewer sign-off are info-only context summaries. Public
          reports exclude tank names, raw IDs, free-text notes, photo paths, and action
          checklists.
        </p>
      </section>

      {query.error ? (
        <section className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {query.error}
        </section>
      ) : null}

      <section className="mb-6 rounded-[2rem] border border-border bg-card p-6">
        <h2 className="text-2xl font-semibold tracking-tight">Generate deterministic report</h2>
        {latestTest ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Uses the latest water test from {new Date(latestTest.tested_at).toLocaleString()} plus recent observations.
            </p>
            <form action={generateReport} className="mt-5">
              <input name="tankId" type="hidden" value={tank.id} />
              <button className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground" type="submit">
                Generate report
              </button>
            </form>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Log a water test before generating a report.
          </p>
        )}
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <h2 className="text-2xl font-semibold tracking-tight">Recent reports</h2>
        {reports && reports.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {reports.map((report) => {
              const publicReport = report.sanitized_public_content as {
                severity?: string;
                rulesUnderReview?: boolean;
              };

              return (
                <article className="rounded-2xl border border-border bg-background p-4" key={report.id}>
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {new Date(report.generated_at).toLocaleString()} · {report.type}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight">
                        Public severity: {publicReport.severity ?? "unknown"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {publicReport.rulesUnderReview
                          ? "Info-only public projection; checklist hidden."
                          : "Reviewer-signed public projection."}
                      </p>
                      {report.share_enabled ? (
                        <p className="mt-2 break-all text-sm text-muted-foreground">
                          Share link: <Link className="underline" href={`/r/${report.share_id}`}>{`/r/${report.share_id}`}</Link>
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Sharing is currently off.
                        </p>
                      )}
                      {report.share_expires_at ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Expires {new Date(report.share_expires_at).toLocaleString()}
                        </p>
                      ) : null}
                    </div>

                    <form action={report.share_enabled ? revokeReportShare : enableReportShare}>
                      <input name="tankId" type="hidden" value={tank.id} />
                      <input name="reportId" type="hidden" value={report.id} />
                      <button className="rounded-full border border-border px-5 py-3 font-medium" type="submit">
                        {report.share_enabled ? "Revoke share" : "Enable share"}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No reports generated yet.
          </p>
        )}
      </section>
    </main>
  );
}
