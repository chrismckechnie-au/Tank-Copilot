import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildReportAiRequest,
  maybeEnhancePublicReport,
  type ReportAiClient,
} from "./report";
import type { PublicReportV1 } from "@/lib/reports/builder";

const baseReport: PublicReportV1 = {
  version: "PublicReportV1",
  reportType: "community",
  title: "Reef aquarium context report",
  generatedAt: "2026-06-16T01:00:00.000Z",
  tank: {
    type: "reef",
    volumeLiters: 432,
  },
  ruleVersion: "rules-v0",
  severity: "yellow",
  confidence: "medium",
  reviewStatus: "unsigned",
  displayMode: "info_only",
  rulesUnderReview: true,
  generatedWithAi: false,
  summary: "Rules are under expert review. This is deterministic fallback text.",
  explanations: [],
  checklist: [],
  openQuestions: ["Confirm nitrate before relying on this report."],
  observationSummary: {
    count: 1,
    symptoms: ["coral_retracted"],
  },
  genericNextSteps: [
    "Confirm the latest water-test values before interpreting this report.",
  ],
  watermark: "Powered by Tank Copilot",
};

describe("report AI boundary", () => {
  it("falls back to deterministic content when disabled", async () => {
    const report = await maybeEnhancePublicReport(baseReport, {
      enabled: false,
      apiKey: undefined,
      client: fakeClient({
        summary: "AI should not run",
        openQuestions: [],
      }),
    });

    expect(report).toEqual(baseReport);
    expect(report.generatedWithAi).toBe(false);
  });

  it("applies only allowed AI text fields and preserves safety-critical fields", async () => {
    const report = await maybeEnhancePublicReport(baseReport, {
      enabled: true,
      apiKey: "test-key",
      client: fakeClient({
        severity: "green",
        ruleVersion: "fake",
        summary: "AI-polished context summary without advice.",
        openQuestions: ["What changed in the last 24 hours?"],
      }),
    });

    expect(report.generatedWithAi).toBe(true);
    expect(report.summary).toBe("AI-polished context summary without advice.");
    expect(report.openQuestions).toEqual(["What changed in the last 24 hours?"]);
    expect(report.severity).toBe(baseReport.severity);
    expect(report.ruleVersion).toBe(baseReport.ruleVersion);
    expect(report.rulesUnderReview).toBe(true);
    expect(report.checklist).toEqual([]);
  });

  it("falls back if red-severity AI prose softens urgency", async () => {
    const report = await maybeEnhancePublicReport(
      {
        ...baseReport,
        severity: "red",
      },
      {
        enabled: true,
        apiKey: "test-key",
        client: fakeClient({
          summary: "This is probably fine and not urgent.",
          openQuestions: ["Can we wait and see?"],
        }),
      },
    );

    expect(report.summary).toBe(baseReport.summary);
    expect(report.generatedWithAi).toBe(false);
  });

  it("falls back if AI prose claims a yellow or red report is green or all clear", async () => {
    const report = await maybeEnhancePublicReport(baseReport, {
      enabled: true,
      apiKey: "test-key",
      client: fakeClient({
        summary: "This is green and all clear with no concerns for the aquarium.",
        openQuestions: ["Is this safe for livestock?"],
      }),
    });

    expect(report.summary).toBe(baseReport.summary);
    expect(report.generatedWithAi).toBe(false);
  });

  it("falls back if AI prose claims the unsigned report is signed or actionable", async () => {
    const report = await maybeEnhancePublicReport(baseReport, {
      enabled: true,
      apiKey: "test-key",
      client: fakeClient({
        summary: "This expert-reviewed report is signed and actionable for the tank.",
        openQuestions: ["Which action should be taken first?"],
      }),
    });

    expect(report.summary).toBe(baseReport.summary);
    expect(report.generatedWithAi).toBe(false);
  });

  it("falls back if AI prose references alternate rule versions or reviewed status", async () => {
    const report = await maybeEnhancePublicReport(baseReport, {
      enabled: true,
      apiKey: "test-key",
      client: fakeClient({
        summary: "Reviewed by an aquatic vet under rules-v99 for this aquarium context.",
        openQuestions: ["Should this guidance be treated as reviewed?"],
      }),
    });

    expect(report.summary).toBe(baseReport.summary);
    expect(report.generatedWithAi).toBe(false);
  });

  it("falls back if AI prose claims actionability or specialist assessment status", async () => {
    const report = await maybeEnhancePublicReport(baseReport, {
      enabled: true,
      apiKey: "test-key",
      client: fakeClient({
        summary: "This specialist assessment report confirms actionability for the aquarium.",
        openQuestions: ["Can this be treated as expert verified?"],
      }),
    });

    expect(report.summary).toBe(baseReport.summary);
    expect(report.generatedWithAi).toBe(false);
  });

  it("falls back if AI prose recommends quantified dosing or rapid corrective action", async () => {
    const report = await maybeEnhancePublicReport(baseReport, {
      enabled: true,
      apiKey: "test-key",
      client: fakeClient({
        summary: "Add 5 ml copper now and do a 50% water change.",
        openQuestions: ["Can medication be dosed immediately?"],
      }),
    });

    expect(report.summary).toBe(baseReport.summary);
    expect(report.generatedWithAi).toBe(false);
  });

  it("falls back if AI prose recommends non-quantified water replacement or additives", async () => {
    const report = await maybeEnhancePublicReport(baseReport, {
      enabled: true,
      apiKey: "test-key",
      client: fakeClient({
        summary: "Replace half the water and use aquarium salt or water conditioner.",
        openQuestions: ["Which instruction should be followed first?"],
      }),
    });

    expect(report.summary).toBe(baseReport.summary);
    expect(report.generatedWithAi).toBe(false);
  });

  it("falls back if AI prose suggests non-imperative additive variants", async () => {
    const report = await maybeEnhancePublicReport(baseReport, {
      enabled: true,
      apiKey: "test-key",
      client: fakeClient({
        summary: "Aquarium salt may help, and you could try water conditioner or additives.",
        openQuestions: ["Would additives help?"],
      }),
    });

    expect(report.summary).toBe(baseReport.summary);
    expect(report.generatedWithAi).toBe(false);
  });

  it("falls back if red-severity AI prose uses softer monitoring language", async () => {
    const report = await maybeEnhancePublicReport(
      {
        ...baseReport,
        severity: "red",
      },
      {
        enabled: true,
        apiKey: "test-key",
        client: fakeClient({
          summary: "This appears manageable; monitor the aquarium over the next few days.",
          openQuestions: ["What changed recently?"],
        }),
      },
    );

    expect(report.summary).toBe(baseReport.summary);
    expect(report.generatedWithAi).toBe(false);
  });

  it("does not run AI polish for red severity reports", async () => {
    const client = fakeClient({
      summary: "AI should not run for red reports.",
      openQuestions: [],
    });
    const complete = vi.spyOn(client, "complete");

    const report = await maybeEnhancePublicReport(
      {
        ...baseReport,
        severity: "red",
      },
      {
        enabled: true,
        apiKey: "test-key",
        client,
      },
    );

    expect(report.summary).toBe(baseReport.summary);
    expect(report.generatedWithAi).toBe(false);
    expect(complete).not.toHaveBeenCalled();
  });

  it("falls back if the AI client throws or returns invalid JSON", async () => {
    const thrownReport = await maybeEnhancePublicReport(baseReport, {
      enabled: true,
      apiKey: "test-key",
      client: {
        async complete() {
          throw new Error("provider unavailable");
        },
      },
    });
    const invalidReport = await maybeEnhancePublicReport(baseReport, {
      enabled: true,
      apiKey: "test-key",
      client: fakeRawClient("not json"),
    });

    expect(thrownReport.generatedWithAi).toBe(false);
    expect(thrownReport.summary).toBe(baseReport.summary);
    expect(invalidReport.generatedWithAi).toBe(false);
    expect(invalidReport.summary).toBe(baseReport.summary);
  });

  it("falls back if the AI client times out", async () => {
    const report = await maybeEnhancePublicReport(baseReport, {
      enabled: true,
      apiKey: "test-key",
      timeoutMs: 1,
      client: {
        async complete(_request, signal) {
          return new Promise((_, reject) => {
            signal.addEventListener("abort", () => reject(new Error("aborted")), {
              once: true,
            });
          });
        },
      },
    });

    expect(report.summary).toBe(baseReport.summary);
    expect(report.generatedWithAi).toBe(false);
  });

  it("builds an allowlisted prompt payload without raw IDs, share IDs, photos, or free-text notes", () => {
    const request = buildReportAiRequest({
      ...baseReport,
      title: "Reef aquarium context report",
      openQuestions: [
        "Moved house from 12 Sample Street and uploaded private-photo.jpg",
      ],
      observationSummary: {
        count: 2,
        symptoms: [
          "coral_retracted",
          "Moved house from 12 Sample Street and uploaded private-photo.jpg",
        ],
      },
    });
    const payload = JSON.stringify(request);

    expect(payload).toContain("reef");
    expect(payload).toContain("yellow");
    expect(request.context.structuredSymptoms).toEqual(["coral_retracted"]);
    expect(payload).not.toContain("123e4567");
    expect(payload).not.toContain("share");
    expect(payload).not.toContain("private-photo");
    expect(payload).not.toContain("Sample Street");
  });
});

function fakeClient(response: Record<string, unknown>): ReportAiClient {
  return {
    async complete() {
      return response;
    },
  };
}

function fakeRawClient(response: unknown): ReportAiClient {
  return {
    async complete() {
      return response;
    },
  };
}
