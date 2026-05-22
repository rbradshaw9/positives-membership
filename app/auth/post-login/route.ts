import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginDestination } from "@/lib/auth/resolve-post-login-destination";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/today";
  const supabase = await createClient();
  const destination = await resolvePostLoginDestination(supabase, next);

  return NextResponse.redirect(`${origin}${destination}`);
}
