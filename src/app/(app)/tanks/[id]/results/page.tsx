import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  buildRecommendationDraft,
  recommendationDraftFromRecord,
  recommendationDisplayChecklist,
} from "@/lib/rules/recommendations";
import { hasPublicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type ResultsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ test?: string; warning?: string }>;
};

export default async function ResultsPage({ params, searchParams }: ResultsPageProps) {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: tank } = await supabase
    .from("tanks")
    .select("id,name,type,volume_liters,water_source")
    .eq("id", id)
    .single();

  if (!tank) {
    notFound();
  }

  const testQuery = supabase
    .from("water_tests")
    .select(
      "id,tested_at,ammonia,nitrite,nitrate,ph,temp_c,salinity,kh,gh,phosphate,calcium,magnesium",
    )
    .eq("tank_id", tank.id)
    .order("tested_at", { ascending: false })
    .limit(1);

  const { data: tests } = query.test ? await testQuery.eq("id", query.test) : await testQuery;
  const latestTest = tests?.[0];

  if (!latestTest) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <section className="rounded-[2rem] border border-border bg-card p-8 shadow-xl shadow-primary/10">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
            Result unavailable
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em]">
            Log a water test first.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Results consume real tank and test data. No saved test exists for this tank yet.
          </p>
          <Link
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-primary-foreground"
            href={`/tanks/${tank.id}/test`}
          >
            Log water test
          </Link>
        </section>
      </main>
    );
  }

  const { data: persistedRecommendation } = await supabase
    .from("recommendations")
    .select(
      "id,tank_id,water_test_id,severity,flags,rule_ids,rule_version,explanation,explanations,checklist,confidence,review_status,display_mode,missing_fields,created_at",
    )
    .eq("water_test_id", latestTest.id)
    .maybeSingle();
  const draft = persistedRecommendation
    ? recommendationDraftFromRecord(persistedRecommendation)
    : buildRecommendationDraft({ tank, waterTest: latestTest });
  const displayChecklist = recommendationDisplayChecklist(draft);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="mb-6 rounded-[2rem] border border-amber-300/50 bg-amber-50 p-5 text-amber-950 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.22em]">Rules under expert review</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Info-only internal QA result. Do not use this as tank-care advice yet.
        </h1>
        <p className="mt-2 text-sm leading-6">
          Action checklists, urgent recommendations, reports, and share links stay disabled
          until Rules v0 has two domain reviewer sign-offs.
        </p>
      </section>

      {query.warning ? (
        <section className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          The test saved, but the recommendation row did not persist. This page is
          recomputing the internal QA result from the saved water test as an explicit fallback.
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
              {tank.type.toUpperCase()} · {tank.volume_liters} L · {tank.water_source}
            </p>
            <h2 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em]">
              {tank.name} latest result
            </h2>
            <p className="mt-2 text-muted-foreground">
              Test logged {new Date(latestTest.tested_at).toLocaleString()}
            </p>
          </div>
          <span className={severityClassName(draft.severity)}>
            Internal {draft.severity}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric label="Rule version" value={draft.ruleVersion} />
          <Metric label="Confidence" value={draft.confidence} />
          <Metric
            label="Persistence"
            value={persistedRecommendation ? "Saved recommendation" : "Computed fallback"}
          />
        </div>

        <section className="mt-8 rounded-2xl bg-background p-5">
          <h3 className="text-xl font-semibold tracking-tight">Internal QA summary</h3>
          <p className="mt-2 text-muted-foreground">{draft.explanation}</p>
          {draft.missingFields.length > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Missing fields: {draft.missingFields.join(", ")}
            </p>
          ) : null}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <InfoList
            empty="No unsigned rule explanations matched this test."
            items={draft.explanations.map((explanation) => (
              <span key={explanation.ruleId}>
                <strong>{explanation.ruleId}</strong>: {explanation.message} Source{" "}
                {explanation.sourceId}; {explanation.reviewStatus}.
              </span>
            ))}
            title="Matched unsigned rules"
          />
          <InfoList
            empty="No flags from the current unsigned rules."
            items={draft.flags.map((flag) => (
              <span key={flag}>{flag}</span>
            ))}
            title="Flags"
          />
        </section>

        <section className="mt-6 rounded-2xl border border-dashed border-border p-5">
          <h3 className="text-xl font-semibold tracking-tight">Action checklist</h3>
          {displayChecklist.length > 0 ? (
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
              {displayChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Hidden until Rules v0 is signed. This prevents unsigned urgent actions from
              appearing as product advice.
            </p>
          )}
        </section>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className="rounded-full bg-primary px-5 py-3 text-center font-medium text-primary-foreground"
            href={`/tanks/${tank.id}/test`}
          >
            Log another test
          </Link>
          <button
            className="rounded-full border border-border px-5 py-3 text-muted-foreground"
            disabled
            type="button"
          >
            Generate report disabled pending sign-off
          </button>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function InfoList({
  empty,
  items,
  title,
}: {
  empty: string;
  items: ReactNode[];
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function severityClassName(severity: string) {
  const base = "rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.18em]";

  if (severity === "red") {
    return `${base} bg-destructive text-destructive-foreground`;
  }

  if (severity === "yellow") {
    return `${base} bg-amber-100 text-amber-950`;
  }

  return `${base} bg-secondary text-secondary-foreground`;
}
