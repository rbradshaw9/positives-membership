import { createClient } from "@/lib/supabase/server";
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

  return NextResponse.redirect(`${origin}${next}`);
}
