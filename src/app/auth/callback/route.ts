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
  const cookieName = "sb-lpbddkmqhddiywyivrom-auth-token";

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
      const next = ${JSON.stringify(next)};
      const cookieName = ${JSON.stringify(cookieName)};
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const expiresIn = Number(hash.get("expires_in") || "3600");
      const expiresAt = Number(hash.get("expires_at") || Math.floor(Date.now() / 1000) + expiresIn);
      const tokenType = hash.get("token_type") || "bearer";

      function base64Url(value) {
        const bytes = new TextEncoder().encode(value);
        let binary = "";
        bytes.forEach((byte) => {
          binary += String.fromCharCode(byte);
        });
        return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
      }

      if (!accessToken || !refreshToken) {
        window.location.replace("/login?error=auth-code");
      } else {
        const session = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          expires_in: expiresIn,
          token_type: tokenType,
          user: null
        };
        const cookieValue = "base64-" + base64Url(JSON.stringify(session));
        document.cookie = cookieName + "=" + encodeURIComponent(cookieValue) + "; Path=/; Max-Age=34560000; SameSite=Lax; Secure";
        window.location.replace(next);
      }
    </script>
  </body>
</html>`;
}
