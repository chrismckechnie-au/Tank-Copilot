import { hasPublicSupabaseConfig } from "@/lib/env";
import type { PublicReportV1 } from "@/lib/reports/builder";
import { createClient } from "@/lib/supabase/server";

type PublicReportPayload =
  | {
      status: "ok";
      report: PublicReportV1;
    }
  | {
      status: "gone";
    };

const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "text/html; charset=utf-8",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;

  if (!/^[0-9a-f]{32}$/i.test(shareId)) {
    return htmlResponse("Report link not found", 404);
  }

  if (!hasPublicSupabaseConfig()) {
    return htmlResponse("Report sharing is not configured", 503);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_report", {
    p_share_id: shareId.toLowerCase(),
  });

  if (error || !isPublicReportPayload(data)) {
    return htmlResponse("Report link not found", 404);
  }

  if (data.status === "gone") {
    return htmlResponse("Report link expired or revoked", 410);
  }

  return htmlResponse(renderPublicReport(data.report), 200);
}

function htmlResponse(body: string, status: number) {
  const content = body.startsWith("<!doctype html>")
    ? body
    : `<!doctype html><meta name="robots" content="noindex,nofollow"><title>Tank Copilot report</title><main>${escapeHtml(body)}</main>`;

  return new Response(content, {
    headers,
    status,
  });
}

function renderPublicReport(report: PublicReportV1) {
  const explanations = report.explanations.length > 0
    ? report.explanations
        .map(
          (explanation) =>
            `<li><strong>${escapeHtml(explanation.ruleId)}</strong>: ${escapeHtml(explanation.message)} (${escapeHtml(explanation.sourceId)})</li>`,
        )
        .join("")
    : "<li>No signed rule explanations are available yet.</li>";
  const checklist = report.checklist.length > 0
    ? report.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>No action checklist is published while rules are under expert review.</li>";
  const openQuestions = report.openQuestions.length > 0
    ? report.openQuestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>No open questions recorded.</li>";
  const symptoms = report.observationSummary.symptoms.length > 0
    ? report.observationSummary.symptoms.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>No structured symptoms recorded.</li>";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>${escapeHtml(report.title)} · Tank Copilot</title>
    <style>
      body { background: #f6f1e8; color: #201b16; font-family: Georgia, "Times New Roman", serif; margin: 0; }
      main { margin: 0 auto; max-width: 840px; padding: 48px 20px; }
      section { background: #fffaf2; border: 1px solid #d8c8ac; border-radius: 28px; margin-top: 18px; padding: 24px; }
      .eyebrow { color: #7c4f20; font: 700 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .18em; text-transform: uppercase; }
      h1 { font-size: clamp(36px, 8vw, 72px); letter-spacing: -.06em; line-height: .9; margin: 10px 0; }
      h2 { font-size: 24px; margin: 0 0 12px; }
      li { margin: 8px 0; }
      .banner { background: #fff2c2; border-color: #d7a321; }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Tank Copilot public report · ${escapeHtml(report.version)}</p>
      <h1>${escapeHtml(report.title)}</h1>
      <p>${escapeHtml(report.summary)}</p>
      <section class="banner">
        <h2>Safety status</h2>
        <p>Severity: <strong>${escapeHtml(report.severity)}</strong>. Review status: <strong>${escapeHtml(report.reviewStatus)}</strong>.</p>
        <p>${report.rulesUnderReview ? "Rules are under expert review. This page is context only, not aquarium-care advice." : "Rules used in this report have reviewer sign-off."}</p>
      </section>
      <section>
        <h2>Tank context</h2>
        <p>Type: ${escapeHtml(report.tank.type)}. Rounded volume: ${report.tank.volumeLiters} L.</p>
        <p>Generated: ${escapeHtml(report.generatedAt)}. Rule version: ${escapeHtml(report.ruleVersion)}.</p>
      </section>
      <section>
        <h2>Structured observations</h2>
        <p>Observation count: ${report.observationSummary.count}.</p>
        <ul>${symptoms}</ul>
      </section>
      <section>
        <h2>Rule explanations</h2>
        <ul>${explanations}</ul>
      </section>
      <section>
        <h2>Checklist</h2>
        <ul>${checklist}</ul>
      </section>
      <section>
        <h2>Open questions</h2>
        <ul>${openQuestions}</ul>
      </section>
      <section>
        <h2>Generic next steps</h2>
        <ul>${report.genericNextSteps.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <p>${escapeHtml(report.watermark)}</p>
    </main>
  </body>
</html>`;
}

function isPublicReportPayload(value: unknown): value is PublicReportPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  if (payload.status === "gone") {
    return true;
  }

  return payload.status === "ok" && isPublicReport(payload.report);
}

function isPublicReport(value: unknown): value is PublicReportV1 {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<PublicReportV1>;
  return (
    report.version === "PublicReportV1" &&
    report.reportType === "community" &&
    typeof report.title === "string" &&
    typeof report.generatedAt === "string" &&
    typeof report.ruleVersion === "string" &&
    Array.isArray(report.explanations) &&
    Array.isArray(report.checklist) &&
    Array.isArray(report.openQuestions) &&
    Array.isArray(report.genericNextSteps) &&
    typeof report.observationSummary === "object" &&
    report.observationSummary !== null
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}
