import { requireActiveMember } from "@/lib/auth/require-active-member";
import { MemberNav } from "@/components/member/MemberNav";
import { headers } from "next/headers";

/**
 * app/(member)/layout.tsx
 * Protected layout for all member-area routes.
 *
 * Calls requireActiveMember() server-side:
 * - Unauthenticated users → /login
 * - Authenticated users with inactive subscription → /subscribe
 * - Authenticated active members → renders children
 *
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
