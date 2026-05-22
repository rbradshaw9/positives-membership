import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginDestination } from "@/lib/auth/resolve-post-login-destination";
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

  function safePath(path: string | null | undefined) {
    if (!path || !path.startsWith("/") || path.startsWith("//")) return fallbackPathForType(type);
    if (path.startsWith("/api/")) return fallbackPathForType(type);
    if (path.startsWith("/auth/") && !path.startsWith("/auth/callback")) {
      return fallbackPathForType(type);
    }
    return path;
  }

  if (rawTarget.startsWith("/")) {
    if (rawTarget.startsWith("/auth/callback")) {
      try {
        const legacy = new URL(rawTarget, new URL(request.url).origin);
        const nextParam = legacy.searchParams.get("next");
        return safePath(nextParam);
      } catch {
        return fallbackPathForType(type);
      }
    }
    return safePath(rawTarget);
  }

  try {
    const targetUrl = new URL(rawTarget);
    const requestUrl = new URL(request.url);

    if (targetUrl.origin !== requestUrl.origin) {
      return fallbackPathForType(type);
    }

    if (targetUrl.pathname === "/auth/callback") {
      const nextParam = targetUrl.searchParams.get("next");
      return safePath(nextParam);
    }

    return safePath(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
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

  // For password recovery, use the sanitized target as-is (leads to /reset-password).
  // For all other types (email confirm, invite, email_change), run the same
  // post-login routing as the login page and magic-link callback so admins,
  // inactive members, etc. all land in the right place.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}${redirectTarget}`);
  }

  const destination = await resolvePostLoginDestination(supabase, redirectTarget);
  return NextResponse.redirect(`${origin}${destination}`);
}
