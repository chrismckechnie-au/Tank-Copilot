"use client";

import posthog from "posthog-js";
import { type ReactNode, useEffect } from "react";

import { createPostHogConfig } from "@/lib/analytics";

type AnalyticsProviderProps = {
  children: ReactNode;
};

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

    if (!key || posthog.__loaded) {
      return;
    }

    posthog.init(key, createPostHogConfig(process.env.NEXT_PUBLIC_POSTHOG_HOST));
  }, []);

  return children;
}
