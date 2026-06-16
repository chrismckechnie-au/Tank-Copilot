import { describe, expect, it } from "vitest";

import { buildReportContent } from "./builder";
import { buildBrandedReport } from "./branded";

const fullReport = buildReportContent({
  generatedAt: "2026-06-16T01:00:00.000Z",
  tank: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Lobby reef <script>",
    type: "reef",
    volume_liters: 320,
  },
  latestWaterTest: {
    id: "123e4567-e89b-12d3-a456-426614174111",
    tested_at: "2026-06-16T00:30:00.000Z",
    ammonia: 0,
    nitrite: 0,
    nitrate: 5,
    ph: 8.1,
    temp_c: 25.4,
    salinity: 35,
    kh: 8.2,
    gh: null,
    phosphate: 0.04,
    calcium: 430,
    magnesium: 1350,
  },
  recommendation: {
    severity: "yellow",
    rule_version: "rules-v0",
    explanation: "Rules are under expert review.",
    explanations: [],
    checklist: [],
    confidence: "medium",
    review_status: "unsigned",
    display_mode: "info_only",
    missing_fields: [],
  },
  observations: [],
}).full;

describe("buildBrandedReport", () => {
  it("renders escaped business-branded HTML without a Tank Copilot watermark", () => {
    const branded = buildBrandedReport({
      business: {
        name: "Harbour Aquatics",
        logoPath: "https://cdn.example.com/logo.png",
      },
      client: {
        name: "Jones family",
        contact: "client@example.com",
        location: "Brisbane",
      },
      report: fullReport,
    });

    expect(branded.version).toBe("BrandedReportV1");
    expect(branded.html).toContain("Harbour Aquatics aquarium service report");
    expect(branded.html).toContain("client@example.com");
    expect(branded.html).not.toContain("Powered by Tank Copilot");
    expect(branded.html).not.toContain("Tank Copilot");
    expect(branded.html).not.toContain("<script>");
    expect(branded.html).toContain("&lt;script&gt;");
  });
});
