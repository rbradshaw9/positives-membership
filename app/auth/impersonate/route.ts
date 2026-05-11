import { createClient } from "@/lib/supabase/server";
import {
  IMPERSONATION_COOKIE_NAME,
  IMPERSONATION_MAX_AGE_SECONDS,
  verifyImpersonationSessionToken,
} from "@/lib/auth/impersonation-session";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function sanitizeNext(rawNext: string | null, origin: string) {
  if (!rawNext) return "/today";
  if (rawNext.startsWith("/")) return rawNext;

  try {
    const url = new URL(rawNext);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : "/today";
  } catch {
    return "/today";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const next = sanitizeNext(searchParams.get("next"), origin);
  const state = searchParams.get("state");
  const impersonationSession = verifyImpersonationSessionToken(state);

  if (!tokenHash) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const supabase = await createClient();

  // Impersonation should replace the current browser session, not sit beside it.
  await supabase.auth.signOut().catch((error) => {
    console.warn("[auth/impersonate] pre-clear signOut failed:", error);
  });

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (error) {
    console.error("[auth/impersonate] verifyOtp failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  if (impersonationSession.ok && state) {
    response.cookies.set(IMPERSONATION_COOKIE_NAME, state, {
      httpOnly: true,
      secure: origin.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: IMPERSONATION_MAX_AGE_SECONDS,
    });
  }

  return response;
}
