import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const emailOtpTypes = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function safeType(value: string | null) {
  return emailOtpTypes.has(value ?? "") ? value : "email";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = safeType(requestUrl.searchParams.get("type"));
  const next = safeNext(requestUrl.searchParams.get("next"));
  const redirectTo = request.nextUrl.clone();

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      redirectTo.pathname = next;
      redirectTo.search = "";
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.search = `?error=auth-code&next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(redirectTo);
}
