import type { BrandedReportV1 } from "./branded";

export const reportArtifactsBucket = "report-pdfs";

export type ReportArtifact = {
  path: string;
  body: Blob;
  contentType: "text/html; charset=utf-8";
};

export function buildBrandedReportArtifact(input: {
  ownerUserId: string;
  reportId: string;
  brandedReport: BrandedReportV1;
}): ReportArtifact {
  return {
    path: `${input.ownerUserId}/${input.reportId}/branded-report.html`,
    body: new Blob([input.brandedReport.html], { type: "text/html; charset=utf-8" }),
    contentType: "text/html; charset=utf-8",
  };
}

