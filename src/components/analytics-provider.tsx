"use client";

import posthog from "posthog-js";
import type { BeforeSendFn } from "posthog-js";
import { type ReactNode, useEffect } from "react";

import { beforeSendPostHogEvent } from "@/lib/analytics";

type AnalyticsProviderProps = {
  children: ReactNode;
};

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

    if (!key || posthog.__loaded) {
      return;
    }

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      autocapture: false,
      before_send: beforeSendPostHogEvent as BeforeSendFn,
      capture_pageview: false,
      person_profiles: "identified_only",
    });
  }, []);

  return children;
}
