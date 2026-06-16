import type { FullReportV1 } from "./builder";

export type BrandedReportInput = {
  business: {
    name: string;
    logoPath: string | null;
  };
  client: {
    name: string;
    contact: string;
    location: string;
  };
  report: FullReportV1;
};

export type BrandedReportV1 = {
  version: "BrandedReportV1";
  businessName: string;
  clientName: string;
  generatedAt: string;
  html: string;
};

export function buildBrandedReport(input: BrandedReportInput): BrandedReportV1 {
  const title = `${input.business.name} aquarium service report`;
  const clientContact = [input.client.contact, input.client.location]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" · ");
  const logo = input.business.logoPath
    ? `<img src="${escapeAttribute(input.business.logoPath)}" alt="${escapeAttribute(input.business.name)} logo" />`
    : "";
  const latest = input.report.latestWaterTest.parameters;

  return {
    version: "BrandedReportV1",
    businessName: input.business.name,
    clientName: input.client.name,
    generatedAt: input.report.generatedAt,
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { color: #132018; font-family: Georgia, "Times New Roman", serif; margin: 40px; }
      header { align-items: center; border-bottom: 2px solid #224734; display: flex; justify-content: space-between; padding-bottom: 24px; }
      img { max-height: 72px; max-width: 220px; object-fit: contain; }
      h1 { font-size: 34px; line-height: 1.05; margin: 0; }
      h2 { border-bottom: 1px solid #d6ded8; margin-top: 32px; padding-bottom: 8px; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border-bottom: 1px solid #edf1ee; padding: 10px; text-align: left; }
      .muted { color: #5d6c62; }
      .severity { border: 1px solid #224734; border-radius: 999px; display: inline-block; padding: 6px 12px; text-transform: uppercase; }
    </style>
  </head>
  <body>
    <header>
      <div>
        <p class="muted">${escapeHtml(input.business.name)}</p>
        <h1>${escapeHtml(title)}</h1>
      </div>
      ${logo}
    </header>
    <section>
      <h2>Client</h2>
      <p><strong>${escapeHtml(input.client.name)}</strong></p>
      ${clientContact ? `<p class="muted">${escapeHtml(clientContact)}</p>` : ""}
    </section>
    <section>
      <h2>Tank</h2>
      <p>${escapeHtml(input.report.tank.name)} · ${input.report.tank.type.toUpperCase()} · ${Math.round(input.report.tank.volumeLiters)} L</p>
    </section>
    <section>
      <h2>Latest water test</h2>
      <table>
        <tbody>
          ${parameterRow("Ammonia", latest.ammonia)}
          ${parameterRow("Nitrite", latest.nitrite)}
          ${parameterRow("Nitrate", latest.nitrate)}
          ${parameterRow("pH", latest.ph)}
          ${parameterRow("Temperature C", latest.tempC)}
          ${parameterRow("Salinity", latest.salinity)}
          ${parameterRow("Alkalinity", latest.alkalinity)}
          ${parameterRow("Phosphate", latest.phosphate)}
          ${parameterRow("Calcium", latest.calcium)}
          ${parameterRow("Magnesium", latest.magnesium)}
        </tbody>
      </table>
    </section>
    <section>
      <h2>Rules summary</h2>
      <p><span class="severity">${escapeHtml(input.report.recommendation.severity)}</span></p>
      <p>${escapeHtml(input.report.recommendation.explanation)}</p>
      <p class="muted">Rules status: ${escapeHtml(input.report.recommendation.review_status)} · Confidence: ${escapeHtml(input.report.recommendation.confidence)}</p>
    </section>
  </body>
</html>`,
  };
}

function parameterRow(label: string, value: number | null | undefined) {
  return `<tr><th>${escapeHtml(label)}</th><td>${value ?? "n/a"}</td></tr>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
