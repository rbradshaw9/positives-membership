import { createClient } from "@/lib/supabase/server";
import {
  IMPERSONATION_COOKIE_NAME,
  verifyImpersonationSessionToken,
} from "@/lib/auth/impersonation-session";
import { isBootstrapAdminEmail } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function actorStillHasAdminAccess(actorId: string, email: string | null | undefined) {
  if (isBootstrapAdminEmail(email)) return true;

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("admin_user_role")
    .select("role_id")
    .eq("member_id", actorId)
    .limit(1);

  if (error) {
    console.error("[auth/impersonate/exit] actor role lookup failed:", error.message);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

function clearImpersonationCookie(response: NextResponse, origin: string) {
  response.cookies.set(IMPERSONATION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const token = request.cookies.get(IMPERSONATION_COOKIE_NAME)?.value ?? null;
  const session = verifyImpersonationSessionToken(token);
  const returnTo = session.ok ? session.payload.returnTo : "/admin/members";

  const supabase = await createClient();
  const adminSupabase = getAdminClient();

  if (!session.ok) {
    await supabase.auth.signOut().catch((error) => {
      console.warn("[auth/impersonate/exit] signOut without session failed:", error);
    });

    const response = NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(returnTo)}&impersonation=ended`
    );
    clearImpersonationCookie(response, origin);
    return response;
  }

  const { data: actorData, error: actorError } = await adminSupabase.auth.admin.getUserById(
    session.payload.actorId
  );
  const actorEmail = actorData.user?.email ?? null;
  const actorCanReturn = await actorStillHasAdminAccess(session.payload.actorId, actorEmail);

  if (actorError || !actorEmail || !actorCanReturn) {
    console.error(
      "[auth/impersonate/exit] could not restore actor session:",
      actorError?.message ?? "actor missing email or admin access"
    );
    await supabase.auth.signOut().catch((error) => {
      console.warn("[auth/impersonate/exit] signOut after restore failure failed:", error);
    });

    const response = NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(returnTo)}&impersonation=ended`
    );
    clearImpersonationCookie(response, origin);
    return response;
  }

  const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
    type: "magiclink",
    email: actorEmail,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
    },
  });
  const tokenHash = linkData?.properties?.hashed_token;

  if (linkError || !tokenHash) {
    console.error(
      "[auth/impersonate/exit] actor restore link generation failed:",
      linkError?.message ?? "missing token hash"
    );
    await supabase.auth.signOut().catch((error) => {
      console.warn("[auth/impersonate/exit] signOut after link failure failed:", error);
    });

    const response = NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(returnTo)}&impersonation=ended`
    );
    clearImpersonationCookie(response, origin);
    return response;
  }

  await supabase.auth.signOut().catch((error) => {
    console.warn("[auth/impersonate/exit] signOut failed:", error);
  });

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (verifyError) {
    console.error("[auth/impersonate/exit] actor restore verifyOtp failed:", verifyError.message);
    const response = NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(returnTo)}&impersonation=ended`
    );
    clearImpersonationCookie(response, origin);
    return response;
  }

  const response = NextResponse.redirect(`${origin}${returnTo}`);
  clearImpersonationCookie(response, origin);
  return response;
}
