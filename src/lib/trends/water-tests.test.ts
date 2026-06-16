import { describe, expect, it } from "vitest";

import { summarizeWaterTrends, type TrendWaterTest } from "./water-tests";

describe("summarizeWaterTrends", () => {
  it("calculates latest deltas in newest-first order", () => {
    const metrics = summarizeWaterTrends([
      baseTest({ tested_at: "2026-06-10T00:00:00.000Z", nitrate: 5 }),
      baseTest({ tested_at: "2026-06-16T00:00:00.000Z", nitrate: 8 }),
    ]);

    expect(metrics.find((metric) => metric.key === "nitrate")).toMatchObject({
      latest: 8,
      previous: 5,
      delta: 3,
      direction: "up",
    });
  });

  it("flags reef stability movement without prescribing corrective action", () => {
    const metrics = summarizeWaterTrends([
      baseTest({ tested_at: "2026-06-10T00:00:00.000Z", salinity: 35, kh: 8 }),
      baseTest({ tested_at: "2026-06-16T00:00:00.000Z", salinity: 36.5, kh: 9.2 }),
    ]);

    expect(metrics.find((metric) => metric.key === "salinity")?.warning).toContain("stability");
    expect(metrics.find((metric) => metric.key === "kh")?.warning).not.toContain("dose");
  });
});

function baseTest(overrides: Partial<TrendWaterTest> = {}): TrendWaterTest {
  return {
    tested_at: "2026-06-16T00:00:00.000Z",
    ammonia: 0,
    nitrite: 0,
    nitrate: 0,
    ph: 8,
    temp_c: 25,
    salinity: 35,
    kh: 8,
    phosphate: 0.03,
    calcium: 430,
    magnesium: 1350,
    ...overrides,
  };
}
