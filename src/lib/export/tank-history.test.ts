import { describe, expect, it } from "vitest";

import { buildTankHistoryExport, tankHistoryToCsv } from "./tank-history";

describe("tank history export", () => {
  it("keeps every history section in JSON export shape", () => {
    const history = buildTankHistoryExport({
      exportedAt: "2026-06-16T00:00:00.000Z",
      tank: { id: "tank-1", name: "Display reef" },
      equipment: [],
      waterTests: [{ nitrate: 5 }],
      recommendations: [],
      observations: [{ recent_changes: "water change" }],
      maintenanceTasks: [{ title: "Water test" }],
      livestock: [{ species_name: "Amphiprion ocellaris" }],
      reports: [{ id: "report-1" }],
    });

    expect(history.waterTests).toHaveLength(1);
    expect(history.livestock).toHaveLength(1);
  });

  it("strips share tokens and nested private artifact paths from every export section", () => {
    const history = buildTankHistoryExport({
      exportedAt: "2026-06-16T00:00:00.000Z",
      tank: { id: "tank-1", name: "Display reef" },
      equipment: [],
      waterTests: [{ photo_path: "user/tank/private-test.jpg" }],
      recommendations: [],
      observations: [{ photo_paths: ["user/tank/observations/private.jpg"] }],
      maintenanceTasks: [],
      livestock: [{ photoPath: "user/tank/livestock/private.jpg" }],
      reports: [
        {
          share_id: "abcdef",
          pdf_path: "user/tank/reports/private.pdf",
          content: {
            observations: [
              {
                photoPaths: ["user/tank/observations/private-report.jpg"],
              },
            ],
          },
        },
      ],
    });
    const payload = JSON.stringify(history);

    expect(payload).not.toContain("share_id");
    expect(payload).not.toContain("pdf_path");
    expect(payload).not.toContain("photo_path");
    expect(payload).not.toContain("photo_paths");
    expect(payload).not.toContain("photoPath");
    expect(payload).not.toContain("photoPaths");
    expect(payload).not.toContain("private");
  });

  it("serializes CSV with escaped values", () => {
    const csv = tankHistoryToCsv({
      exportedAt: "2026-06-16T00:00:00.000Z",
      tank: { name: "Display, reef" },
      equipment: [],
      waterTests: [],
      recommendations: [],
      observations: [],
      maintenanceTasks: [],
      livestock: [],
      reports: [],
    });

    expect(csv).toContain('"Display, reef"');
  });

  it("prefixes spreadsheet formulas in CSV output", () => {
    const csv = tankHistoryToCsv({
      exportedAt: "2026-06-16T00:00:00.000Z",
      tank: { name: "=IMPORTXML(\"https://example.com\")" },
      equipment: [],
      waterTests: [],
      recommendations: [],
      observations: [],
      maintenanceTasks: [],
      livestock: [],
      reports: [],
    });

    expect(csv).toContain("'=IMPORTXML");
  });

  it("prefixes spreadsheet formulas hidden behind whitespace or control characters", () => {
    const csv = tankHistoryToCsv({
      exportedAt: "2026-06-16T00:00:00.000Z",
      tank: { name: " =1+1", notes: "\t=IMPORTXML(\"https://example.com\")" },
      equipment: [],
      waterTests: [],
      recommendations: [],
      observations: [{ recent_changes: "\r=cmd" }],
      maintenanceTasks: [],
      livestock: [],
      reports: [],
    });

    expect(csv).toContain("' =1+1");
    expect(csv).toContain("'\t=IMPORTXML");
    expect(csv).toContain("'\r=cmd");
  });
});
