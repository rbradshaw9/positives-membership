import { createClient } from "@/lib/supabase/server";
import { IMPERSONATION_COOKIE_NAME } from "@/lib/auth/impersonation-session";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function signedOutResponse(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?signed_out=1", request.url), {
    status: 303,
  });

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") || cookie.name === IMPERSONATION_COOKIE_NAME) {
      response.cookies.set(cookie.name, "", {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }
  }

  return response;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut().catch((error) => {
    console.warn("[auth/sign-out] signOut failed:", error);
  });

  return signedOutResponse(request);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
