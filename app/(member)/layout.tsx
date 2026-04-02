import { createClient } from "@/lib/supabase/server";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { PasswordNudgeBanner } from "@/components/member/PasswordNudgeBanner";
import { MemberShellClient } from "@/components/member/MemberShellClient";
import { config } from "@/lib/config";

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
    <MemberShellClient
      streak={streak}
      tier={member.subscription_tier}
      memberName={member.name}
      communityPreviewEnabled={config.app.communityPreviewEnabled}
    >
      {showPasswordNudge && <PasswordNudgeBanner />}
      {children}
    </MemberShellClient>
  );
}
