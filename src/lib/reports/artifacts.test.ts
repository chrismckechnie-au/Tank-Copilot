import { describe, expect, it } from "vitest";

import { buildBrandedReportArtifact, reportArtifactsBucket } from "./artifacts";

describe("buildBrandedReportArtifact", () => {
  it("stores branded artifacts under the owner's private report folder", async () => {
    const artifact = buildBrandedReportArtifact({
      ownerUserId: "user-1",
      reportId: "report-1",
      brandedReport: {
        version: "BrandedReportV1",
        businessName: "Harbour Aquatics",
        clientName: "Jones family",
        generatedAt: "2026-06-16T00:00:00.000Z",
        html: "<!doctype html><html><body>Service report</body></html>",
      },
    });

    expect(reportArtifactsBucket).toBe("report-pdfs");
    expect(artifact.path).toBe("user-1/report-1/branded-report.html");
    expect(artifact.contentType).toBe("text/html; charset=utf-8");
    expect(await artifact.body.text()).toContain("Service report");
  });
});

