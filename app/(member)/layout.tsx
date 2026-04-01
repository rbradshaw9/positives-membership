import { createClient } from "@/lib/supabase/server";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { MemberTopNav } from "@/components/member/MemberTopNav";
import { PasswordNudgeBanner } from "@/components/member/PasswordNudgeBanner";

/**
 * app/(member)/layout.tsx
 * Sprint 9: replaces MemberHeader + bottom MemberNav with the unified
 * MemberTopNav (sticky top bar on desktop, bottom bar on mobile).
 *
 * main padding:
 *   - pt-0 (nav is sticky, page hero provides its own top space)
 *   - pb-24 on mobile (bottom bar), pb-8 on desktop (no bottom bar)
 */
export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await requireActiveMember();

  const showPasswordNudge = member.password_set === false;

  const supabase = await createClient();
  const { data: streakRow } = await supabase
    .from("member")
    .select("practice_streak")
    .eq("id", member.id)
    .single();
  const streak = streakRow?.practice_streak ?? 0;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <MemberTopNav streak={streak} />
      {showPasswordNudge && <PasswordNudgeBanner />}
      <main className="flex-1 pb-24 md:pb-12">{children}</main>
    </div>
  );
}
