import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNext(requestUrl.searchParams.get("next"));
  const redirectTo = request.nextUrl.clone();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      redirectTo.pathname = next;
      redirectTo.search = "";
      return NextResponse.redirect(redirectTo);
    }
  }

  return new Response(hashCallbackBridgeHtml(next), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function hashCallbackBridgeHtml(next: string) {
  const implicitPath = `/auth/implicit-callback?next=${encodeURIComponent(next)}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Completing sign in...</title>
    <meta name="robots" content="noindex" />
  </head>
  <body>
    <p>Completing sign in...</p>
    <script>
      if (window.location.hash) {
        window.location.replace(${JSON.stringify(implicitPath)} + window.location.hash);
      } else {
        window.location.replace("/login?error=auth-code");
      }
    </script>
  </body>
</html>`;
}
