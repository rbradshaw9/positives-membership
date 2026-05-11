import { createClient } from "@/lib/supabase/server";
import {
  IMPERSONATION_COOKIE_NAME,
  verifyImpersonationSessionToken,
} from "@/lib/auth/impersonation-session";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const token = request.cookies.get(IMPERSONATION_COOKIE_NAME)?.value ?? null;
  const session = verifyImpersonationSessionToken(token);
  const returnTo = session.ok ? session.payload.returnTo : "/admin/members";

  const supabase = await createClient();
  await supabase.auth.signOut().catch((error) => {
    console.warn("[auth/impersonate/exit] signOut failed:", error);
  });

  const response = NextResponse.redirect(
    `${origin}/login?next=${encodeURIComponent(returnTo)}&impersonation=ended`
  );
  response.cookies.set(IMPERSONATION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
