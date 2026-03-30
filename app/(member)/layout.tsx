import { requireActiveMember } from "@/lib/auth/require-active-member";
import { MemberNav } from "@/components/member/MemberNav";
import { headers } from "next/headers";

/**
 * app/(member)/layout.tsx
 * Protected layout for all member-area routes.
 *
 * Calls requireActiveMember() server-side — redirects to /login
 * if the user is unauthenticated or subscription is not active.
 * Never relies on client-side billing state.
 */
export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side access guard — throws redirect if unauthorized
  await requireActiveMember();

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "/today";

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <main className="flex-1 pb-24">{children}</main>
      <MemberNav activeHref={pathname} />
    </div>
  );
}
