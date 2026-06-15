import type { BeforeSendFn, PostHogConfig } from "posthog-js";

type CaptureEvent = {
  event: string;
  properties?: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
  timestamp?: Date;
  uuid?: string;
};

const allowedPropertyKeys = new Set([
  "count",
  "feature",
  "path",
  "phase",
  "source",
  "status",
]);

const blockedPathPrefixes = ["/api", "/auth", "/login"];
const sensitiveKeyPattern =
  /(client|code|contact|customer|email|id|image|location|name|note|password|photo|secret|share|text|token|uuid)/i;

export function sanitizePath(input: string | undefined): string | undefined {
  if (!input) {
    return undefined;
  }

  let url: URL;

  try {
    url = new URL(input, "https://tank-copilot.local");
  } catch {
    return undefined;
  }

  const pathname = url.pathname.replace(/\/{2,}/g, "/");

  if (
    blockedPathPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return undefined;
  }

  if (pathname === "/r" || pathname.startsWith("/r/")) {
    return "/r/[shareId]";
  }

  return pathname.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi,
    "/[id]",
  );
}

export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> {
  if (!properties) {
    return {};
  }

  const sanitizedEntries: Array<[string, string | number | boolean]> = [];

  for (const [key, value] of Object.entries(properties)) {
    if (!allowedPropertyKeys.has(key) || sensitiveKeyPattern.test(key)) {
      continue;
    }

    if (typeof value === "string") {
      const sanitizedValue = key === "path" ? sanitizePath(value) : value;
      if (sanitizedValue) {
        sanitizedEntries.push([key, sanitizedValue]);
      }
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      sanitizedEntries.push([key, value]);
    }
  }

  return Object.fromEntries(sanitizedEntries);
}

export function beforeSendPostHogEvent(event: CaptureEvent | null): CaptureEvent | null {
  if (!event) {
    return null;
  }

  const properties = event.properties ?? {};
  const currentUrl =
    typeof properties.$current_url === "string" ? properties.$current_url : undefined;
  const pathname = typeof properties.$pathname === "string" ? properties.$pathname : undefined;
  const sanitizedPath = sanitizePath(pathname ?? currentUrl);

  if ((pathname || currentUrl) && !sanitizedPath) {
    return null;
  }

  return {
    ...event,
    properties: {
      ...sanitizeAnalyticsProperties(properties),
      ...(sanitizedPath ? { path: sanitizedPath } : {}),
    },
    $set: undefined,
    $set_once: undefined,
  };
}

export function createPostHogConfig(apiHost?: string): Partial<PostHogConfig> {
  return {
    api_host: apiHost ?? "https://us.i.posthog.com",
    autocapture: false,
    before_send: beforeSendPostHogEvent as BeforeSendFn,
    capture_pageview: false,
    disable_session_recording: true,
    mask_all_element_attributes: true,
    mask_all_text: true,
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
    },
  };
}
