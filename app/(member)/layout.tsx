import { requireActiveMember } from "@/lib/auth/require-active-member";
import { MemberNav } from "@/components/member/MemberNav";
import { PasswordNudgeBanner } from "@/components/member/PasswordNudgeBanner";
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
 * password_set is returned directly from requireActiveMember() — no second
 * Supabase query needed. Renders a subtle password-setup nudge for
 * guest-onboarded users (password_set = false) — non-blocking, dismissable.
 */
export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Single server-side query: access guard + password_set in one round-trip.
  const member = await requireActiveMember();

  const showPasswordNudge = member.password_set === false;

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
