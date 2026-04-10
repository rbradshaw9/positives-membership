import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type VerifyType = "email" | "recovery" | "invite" | "email_change";

const VALID_TYPES = new Set<VerifyType>([
  "email",
  "recovery",
  "invite",
  "email_change",
]);

function fallbackPathForType(type: VerifyType): string {
  if (type === "recovery") return "/reset-password";
  return "/today";
}

function sanitizeRedirectTarget(
  request: NextRequest,
  rawTarget: string | null,
  type: VerifyType
): string {
  if (!rawTarget) return fallbackPathForType(type);

  if (rawTarget.startsWith("/")) {
    if (rawTarget.startsWith("/auth/callback")) {
      try {
        const legacy = new URL(rawTarget, new URL(request.url).origin);
        const nextParam = legacy.searchParams.get("next");
        if (nextParam?.startsWith("/")) return nextParam;
      } catch {
        return fallbackPathForType(type);
      }
    }
    return rawTarget;
  }

  try {
    const targetUrl = new URL(rawTarget);
    const requestUrl = new URL(request.url);

    if (targetUrl.origin !== requestUrl.origin) {
      return fallbackPathForType(type);
    }

    if (targetUrl.pathname === "/auth/callback") {
      const nextParam = targetUrl.searchParams.get("next");
      if (nextParam?.startsWith("/")) return nextParam;
    }

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return fallbackPathForType(type);
  }
}

function errorRedirect(request: NextRequest, type: VerifyType) {
  const origin = new URL(request.url).origin;

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/forgot-password?error=expired_or_invalid`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");

  if (!tokenHash || !rawType || !VALID_TYPES.has(rawType as VerifyType)) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const type = rawType as VerifyType;
  const nextTarget = searchParams.get("next") ?? searchParams.get("redirect_to");
  const redirectTarget = sanitizeRedirectTarget(request, nextTarget, type);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    console.error("[auth/confirm] verifyOtp failed:", error.message);
    return errorRedirect(request, type);
  }

  return NextResponse.redirect(`${origin}${redirectTarget}`);
}
