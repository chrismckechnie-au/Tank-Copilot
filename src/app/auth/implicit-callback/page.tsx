"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/browser";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export default function ImplicitCallbackPage() {
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    async function completeImplicitSignIn() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const next = safeNext(new URLSearchParams(window.location.search).get("next"));

      if (!accessToken || !refreshToken) {
        window.location.replace(`/login?error=auth-code&next=${encodeURIComponent(next)}`);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setMessage("Sign-in failed. Returning to login...");
        window.location.replace(`/login?error=auth-code&next=${encodeURIComponent(next)}`);
        return;
      }

      window.location.replace(next);
    }

    void completeImplicitSignIn();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
      <section className="rounded-[2rem] border border-border bg-card p-8 shadow-xl">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
          Auth callback
        </p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.04em]">
          {message}
        </h1>
      </section>
    </main>
  );
}
