import { createClient } from "@/lib/supabase/server";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { MemberNav } from "@/components/member/MemberNav";
import { MemberHeader } from "@/components/member/MemberHeader";
import { PasswordNudgeBanner } from "@/components/member/PasswordNudgeBanner";
import { headers } from "next/headers";

/**
 * app/(member)/layout.tsx
 * Sprint 7: adds scrolling MemberHeader (wordmark + streak chip) above content.
 *
 * Header scrolls with content (not sticky) to keep the member area calm.
 * MemberNav remains fixed at the bottom.
 */
export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await requireActiveMember();

  const showPasswordNudge = member.password_set === false;

  // Fetch streak for the header chip
  const supabase = await createClient();
  const { data: streakRow } = await supabase
    .from("member")
    .select("practice_streak")
    .eq("id", member.id)
    .single();
  const streak = streakRow?.practice_streak ?? 0;

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "/today";

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {showPasswordNudge && <PasswordNudgeBanner />}
      <MemberHeader streak={streak} />
      <main className="flex-1 pb-24">{children}</main>
      <MemberNav activeHref={pathname} />
    </div>
  );
}
