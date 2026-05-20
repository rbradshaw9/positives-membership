import Link from "next/link";
import { getAdminPermissionSet, isBootstrapAdminEmail, memberHasAdminRoleKey, requireAdmin } from "@/lib/auth/require-admin";
import { config } from "@/lib/config";
import { BetaFeedbackWidget } from "@/components/member/BetaFeedbackWidget";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { getMemberBetaFeedbackThreads } from "@/lib/beta-feedback/data";
import { AdminSidebarNav } from "./AdminSidebarNav";

/**
 * app/admin/layout.tsx
 * Admin-area layout with server-side email-based access guard.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const permissionSetPromise = getAdminPermissionSet(user.id, user.email);
  const memberPromise = asLooseSupabaseClient(getAdminClient())
    .from("member")
    .select<{ name: string | null; email: string | null; launch_cohort: string | null }>(
      "name, email, launch_cohort"
    )
    .eq("id", user.id)
    .maybeSingle();

  const [permissionSet, memberResult] = await Promise.all([
    permissionSetPromise,
    memberPromise,
  ]);
  const { data: member } = memberResult;
  const canReadMembers = permissionSet.has("members.read");
  const canManageRoles = permissionSet.has("roles.manage");
  const canModerateCommunity = permissionSet.has("community.moderate");
  const canManageCoaching = permissionSet.has("coaching.manage");
  const isCoachOnly =
    canManageCoaching &&
    !canReadMembers &&
    !isBootstrapAdminEmail(user.email) &&
    (await memberHasAdminRoleKey(user.id, "coach"));

  const showBetaFeedback =
    config.app.betaFeedbackEnabled &&
    (member?.launch_cohort === "alpha" || member?.launch_cohort === "beta");
  const betaFeedbackInbox =
    showBetaFeedback ? await getMemberBetaFeedbackThreads(user.id) : { threads: [], unreadCount: 0 };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar hidden sm:flex flex-col">
        <div className="admin-sidebar__logo">
          <div className="admin-sidebar__logo-mark">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="9" cy="9" r="9" fill="url(#admin-logo-grad)" />
              <path d="M6 9.5 8.2 11.5 12 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="admin-logo-grad" x1="0" y1="0" x2="18" y2="18" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2EC4B6" />
                  <stop offset="1" stopColor="#44A8D8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="admin-sidebar__logo-text">Positives</span>
          <span className="admin-sidebar__badge">Admin</span>
        </div>

        <AdminSidebarNav
          canReadMembers={canReadMembers}
          canManageRoles={canManageRoles}
          canModerateCommunity={canModerateCommunity}
          canManageCoaching={canManageCoaching}
          isCoachOnly={isCoachOnly}
        />

        {!isCoachOnly && (
          <div className="admin-sidebar__return">
            <Link href="/today" className="admin-member-return-link">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12h14" />
                <path d="m10 5 7 7-7 7" />
                <path d="M21 5v14" />
              </svg>
              <span>View Member Platform</span>
            </Link>
          </div>
        )}

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__avatar">
            {user.email?.charAt(0).toUpperCase()}
          </div>
          <div className="admin-sidebar__footer-identity">
            <span className="admin-sidebar__user-email">{user.email}</span>
            <Link href="/auth/sign-out" className="admin-sidebar__sign-out">
              Sign out
            </Link>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-mobile-header sm:hidden">
          <span className="font-heading font-bold text-sm text-foreground">
            Positives
          </span>
          <div className="admin-mobile-header__actions">
            <Link href="/today" className="admin-mobile-return-link">
              View Platform
            </Link>
            <span className="admin-sidebar__badge">Admin</span>
          </div>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </div>

      {showBetaFeedback ? (
        <BetaFeedbackWidget
          memberEmail={member?.email ?? user.email ?? null}
          memberName={member?.name ?? null}
          surface="admin"
          initialThreads={betaFeedbackInbox.threads}
          initialUnreadCount={betaFeedbackInbox.unreadCount}
        />
      ) : null}
    </div>
  );
}
