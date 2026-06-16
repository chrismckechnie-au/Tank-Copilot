import { describe, expect, it } from "vitest";

import {
  beforeSendPostHogEvent,
  createPostHogConfig,
  funnelEvents,
  sanitizeAnalyticsProperties,
  sanitizePath,
} from "./analytics";

describe("analytics sanitization", () => {
  it("redacts public report share tokens", () => {
    expect(sanitizePath("/r/sensitive-share-token?email=person@example.com")).toBe(
      "/r/[shareId]",
    );
  });

  it("drops auth and api paths", () => {
    expect(sanitizePath("/auth/callback?code=secret")).toBeUndefined();
    expect(sanitizePath("/api/health?id=secret")).toBeUndefined();
  });

  it("keeps only allowlisted primitive properties", () => {
    expect(
      sanitizeAnalyticsProperties({
        path: "/r/share-token",
        phase: "0",
        plan: "reef_pro",
        email: "person@example.com",
        raw_id: "abc",
        nested: { unsafe: true },
      }),
    ).toEqual({
      path: "/r/[shareId]",
      phase: "0",
      plan: "reef_pro",
    });
  });

  it("drops events with auth callback URLs", () => {
    expect(
      beforeSendPostHogEvent({
        event: "$pageview",
        properties: {
          $current_url: "https://app.example.com/auth/callback?code=secret",
        },
      }),
    ).toBeNull();
  });

  it("normalizes event URLs and strips person mutations", () => {
    expect(
      beforeSendPostHogEvent({
        event: "phase_progress",
        properties: {
          $current_url:
            "https://app.example.com/tanks/123e4567-e89b-12d3-a456-426614174000",
          source: "phase-update",
          contact: "private",
        },
        $set: { email: "person@example.com" },
      }),
    ).toEqual({
      event: "phase_progress",
      properties: {
        path: "/tanks/[id]",
        source: "phase-update",
      },
      $set: undefined,
      $set_once: undefined,
    });
  });

  it("keeps session replay and DOM capture disabled by default", () => {
    expect(createPostHogConfig()).toMatchObject({
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      mask_all_element_attributes: true,
      mask_all_text: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
      },
    });
  });

  it("names the Phase 6 funnel events without user identifiers", () => {
    expect(Object.values(funnelEvents)).toEqual([
      "activation",
      "first_value",
      "report_use",
      "retention",
      "paywall",
      "commercial_intent",
    ]);
  });
});
