import { requireActiveMember } from "@/lib/auth/require-active-member";
import { MemberNav } from "@/components/member/MemberNav";
import { PasswordNudgeBanner } from "@/components/member/PasswordNudgeBanner";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

/**
 * app/(member)/layout.tsx
 * Protected layout for all member-area routes.
 *
 * Calls requireActiveMember() server-side:
 * - Unauthenticated users → /login
 * - Authenticated users with inactive subscription → /join
 * - Authenticated active members → renders children
 *
 * Also renders a subtle password-setup nudge for guest-onboarded users
 * (password_set = false) — non-blocking, dismissable client-side.
 */
export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side access guard — throws redirect if unauthorized
  const member = await requireActiveMember();

  // Fetch password_set for the nudge banner — separate lightweight query
  // so requireActiveMember stays focused on access control.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("member")
    .select("password_set")
    .eq("id", member.id)
    .single();

  const showPasswordNudge = profile?.password_set === false;

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "/today";

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {showPasswordNudge && <PasswordNudgeBanner />}
      <main className="flex-1 pb-24">{children}</main>
      <MemberNav activeHref={pathname} />
    </div>
  );
}
