import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Sign In — Positives",
  description: "Sign in to your Positives membership.",
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: member } = await supabase
      .from("member")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    if (hasActiveMemberAccess(member?.subscription_status)) {
      redirect(next);
    }

    if (member?.subscription_status === "past_due") {
      redirect("/account");
    }

    redirect("/join");
  }

  return <LoginClient />;
}
