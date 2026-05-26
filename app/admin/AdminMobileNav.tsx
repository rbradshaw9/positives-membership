"use client";

import { useEffect, useState } from "react";
import { AdminSidebarNav } from "./AdminSidebarNav";

type AdminMobileNavProps = {
  canReadMembers: boolean;
  canManageRoles: boolean;
  canModerateCommunity: boolean;
  canManageCoaching: boolean;
  isCoachOnly: boolean;
  userEmail: string | null;
};

/**
 * Hamburger + slide-in drawer for admin navigation on small screens.
 * The desktop sidebar is hidden below 640px; this keeps admin navigable there.
 * The drawer closes itself when any nav link inside it is clicked.
 */
export function AdminMobileNav(props: AdminMobileNavProps) {
  const { userEmail, ...navProps } = props;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="admin-mobile-menu-btn"
        aria-label="Open admin menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div className="admin-mobile-drawer-backdrop" onClick={() => setOpen(false)}>
          <div
            className="admin-mobile-drawer"
            role="dialog"
            aria-label="Admin navigation"
            onClick={(event) => {
              event.stopPropagation();
              // Close when a nav link (anchor) is tapped; ignore group toggles.
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <div className="admin-mobile-drawer__head">
              <span className="admin-sidebar__logo-text">Positives</span>
              <button
                type="button"
                className="admin-mobile-menu-btn"
                aria-label="Close admin menu"
                onClick={() => setOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <AdminSidebarNav {...navProps} />

            <div className="admin-mobile-drawer__foot">
              <span className="admin-sidebar__user-email">{userEmail}</span>
              <form action="/auth/sign-out" method="post">
                <button type="submit" className="admin-sidebar__sign-out">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
