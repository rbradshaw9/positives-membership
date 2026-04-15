import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginDestination } from "@/lib/auth/post-login-destination";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * app/auth/callback/route.ts
 * Handles the magic link redirect from Supabase email.
 * Exchanges the code for a session and redirects to the intended destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/today";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const destination = await resolvePostLoginDestination(supabase, next);
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  // Auth failed — redirect to login with error context
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
