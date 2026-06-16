type TrendValue = number | null;

export type TrendWaterTest = {
  tested_at: string;
  ammonia: TrendValue;
  nitrite: TrendValue;
  nitrate: TrendValue;
  ph: TrendValue;
  temp_c: TrendValue;
  salinity: TrendValue;
  kh: TrendValue;
  phosphate: TrendValue;
  calcium: TrendValue;
  magnesium: TrendValue;
};

export type TrendMetric = {
  key: keyof Omit<TrendWaterTest, "tested_at">;
  label: string;
  latest: number | null;
  previous: number | null;
  delta: number | null;
  direction: "up" | "down" | "flat" | "unknown";
  warning: string | null;
};

const metricLabels: Record<TrendMetric["key"], string> = {
  ammonia: "Ammonia",
  nitrite: "Nitrite",
  nitrate: "Nitrate",
  ph: "pH",
  temp_c: "Temperature",
  salinity: "Salinity",
  kh: "Alkalinity",
  phosphate: "Phosphate",
  calcium: "Calcium",
  magnesium: "Magnesium",
};

export function summarizeWaterTrends(tests: TrendWaterTest[]): TrendMetric[] {
  const sorted = [...tests].sort((a, b) => b.tested_at.localeCompare(a.tested_at));
  const latest = sorted[0];
  const previous = sorted[1];

  return (Object.keys(metricLabels) as TrendMetric["key"][]).map((key) => {
    const latestValue = latest?.[key] ?? null;
    const previousValue = previous?.[key] ?? null;
    const delta = latestValue !== null && previousValue !== null
      ? roundDelta(latestValue - previousValue)
      : null;

    return {
      key,
      label: metricLabels[key],
      latest: latestValue,
      previous: previousValue,
      delta,
      direction: trendDirection(delta),
      warning: trendWarning(key, delta),
    };
  });
}

function roundDelta(value: number) {
  return Number(value.toFixed(3));
}

function trendDirection(delta: number | null): TrendMetric["direction"] {
  if (delta === null) {
    return "unknown";
  }

  if (Math.abs(delta) < 0.001) {
    return "flat";
  }

  return delta > 0 ? "up" : "down";
}

function trendWarning(key: TrendMetric["key"], delta: number | null) {
  if (delta === null) {
    return null;
  }

  if ((key === "ammonia" || key === "nitrite") && delta > 0) {
    return "Detectable upward movement needs reviewer context before interpreting risk.";
  }

  if (key === "salinity" && Math.abs(delta) >= 1) {
    return "Reef salinity moved by at least 1 ppt; treat this as a stability flag.";
  }

  if (key === "kh" && Math.abs(delta) >= 1) {
    return "Alkalinity moved by at least 1 dKH; review reef stability before changing anything.";
  }

  if (key === "ph" && Math.abs(delta) >= 0.3) {
    return "pH changed materially between tests; verify with a fresh reading.";
  }

  return null;
}
