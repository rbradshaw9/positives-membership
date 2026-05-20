import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isBootstrapAdminEmail, memberHasAnyAdminRole } from "@/lib/auth/require-admin";
import { resolvePostLoginDestination } from "@/lib/auth/post-login-destination";
import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Sign In — Positives",
  description: "Sign in to your Positives membership.",
  robots: { index: false, follow: false },
};

/**
 * app/login/page.tsx
 * Server wrapper for the returning-member sign-in page.
 * Exports metadata (server-only), delegates rendering to LoginClient.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/today" } = await searchParams;
  const cookieStore = await cookies();
  const hasSupabaseCookie = cookieStore
    .getAll()
    .some(({ name }) => name.startsWith("sb-"));

  if (!hasSupabaseCookie) {
    return <LoginClient />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Staff bypass: admin/coach users with no subscription should go to /admin.
    if (isBootstrapAdminEmail(user.email) || (await memberHasAnyAdminRole(user.id))) {
      redirect("/admin");
    }

    const destination = await resolvePostLoginDestination(supabase, next);
    // Only auto-skip the login form when the user is actively subscribed.
    // Users with canceled/no-subscription still see the form so they can
    // sign in with a different account or re-subscribe after logging in.
    if (destination !== "/join") {
      redirect(destination);
    }
  }

  return <LoginClient />;
}
