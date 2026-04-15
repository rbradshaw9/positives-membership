import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginDestination } from "@/lib/auth/post-login-destination";
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
    redirect(await resolvePostLoginDestination(supabase, next));
  }

  return <LoginClient />;
}
