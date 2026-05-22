"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

type AdminSidebarNavProps = {
  canReadMembers: boolean;
  canManageRoles: boolean;
  canModerateCommunity: boolean;
  canManageCoaching: boolean;
  isCoachOnly: boolean;
};

type AdminNavItem = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  badge?: string;
  subLinks?: Array<{ href: string; label: string }>;
};

type AdminSubLink = NonNullable<AdminNavItem["subLinks"]>[number];

type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

type IconName =
  | "calendar"
  | "coaching"
  | "community"
  | "content"
  | "home"
  | "ingestion"
  | "integrations"
  | "members"
  | "message"
  | "ops"
  | "roles"
  | "team";

function isActivePath(pathname: string, item: AdminNavItem) {
  if (item.exact) return pathname === item.href;
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  // Also mark active when on a sub-link that lives outside this item's path prefix
  if (item.subLinks?.some((sub) => pathname === sub.href.split("?")[0])) return true;
  return false;
}

function hasActiveItem(pathname: string, items: AdminNavItem[]) {
  return items.some((item) => isActivePath(pathname, item));
}

function isActiveSubLink(pathname: string, view: "list" | "calendar", subLink: AdminSubLink) {
  const [subPath, subQuery] = subLink.href.split("?");
  if (pathname !== subPath) return false;
  if (subPath === "/admin/events") {
    const expectedView = new URLSearchParams(subQuery ?? "").get("view");
    if (!expectedView) return true;
    return expectedView === "calendar" ? view === "calendar" : view === "list";
  }
  return true;
}

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  } as const;

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M7.08.22a.6.6 0 0 1 .84 0l6.75 6.64a.596.596 0 1 1-.85.85L7.5 1.5 1.18 7.7a.596.596 0 1 1-.85-.84L7.08.22ZM7.5 3.5l6 6v5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-3h-4v3a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5v-5l6-6Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === "ops") {
    return (
      <svg {...common}>
        <path d="M7.5 1a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM1 6.5a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Zm6.5-3.5a.5.5 0 0 1 .5.5v2.79l1.85 1.86a.5.5 0 1 1-.7.7l-2-2A.5.5 0 0 1 7 6.5v-3a.5.5 0 0 1 .5-.5ZM4.5 14h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1 0-1Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <path d="M4.5 1a.5.5 0 0 1 .5.5V2h5v-.5a.5.5 0 0 1 1 0V2h1a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 12 14H3a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 3 2h1v-.5a.5.5 0 0 1 .5-.5ZM2.5 5.5v7a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-7h-10Zm1.75 2h2v2h-2v-2Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === "coaching") {
    return (
      <svg {...common}>
        <path d="M7.5 1a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-3 4a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm-2 8a5 5 0 0 1 5-5h.5a.5.5 0 0 1 0 1H7.5a4 4 0 0 0-4 4 .5.5 0 0 1-1 0Zm8.5-1.5a.5.5 0 0 1 .5-.5h1v-1a.5.5 0 0 1 1 0v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1-.5-.5Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === "content") {
    return (
      <svg {...common}>
        <path d="M2.5 2h10A1.5 1.5 0 0 1 14 3.5v6a1.5 1.5 0 0 1-1.5 1.5H8v1h2.5a.5.5 0 0 1 0 1h-6a.5.5 0 0 1 0-1H7v-1H2.5A1.5 1.5 0 0 1 1 9.5v-6A1.5 1.5 0 0 1 2.5 2Zm0 1a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-6a.5.5 0 0 0-.5-.5h-10Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === "members" || name === "roles" || name === "team") {
    return (
      <svg {...common}>
        <path d="M7.5 1.25a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-2 3a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-2.25 8.5a4 4 0 0 1 4-4h.5a4 4 0 0 1 4 4 .5.5 0 0 1-1 0 3 3 0 0 0-3-3h-.5a3 3 0 0 0-3 3 .5.5 0 0 1-1 0Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === "message" || name === "community") {
    return (
      <svg {...common}>
        <path d="M2 2.75C2 1.78 2.78 1 3.75 1h7.5C12.22 1 13 1.78 13 2.75v5.5c0 .97-.78 1.75-1.75 1.75H7.53l-3.1 2.73a.5.5 0 0 1-.83-.37V10A1.75 1.75 0 0 1 2 8.25v-5.5Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === "ingestion") {
    return (
      <svg {...common}>
        <path d="M7.82 1.18a.45.45 0 0 0-.64 0l-3 3a.45.45 0 1 0 .64.64L7.05 2.59V9.5a.45.45 0 1 0 .9 0V2.59l2.23 2.23a.45.45 0 0 0 .64-.64l-3-3ZM2.5 10a.5.5 0 0 1 .5.5V12c0 .55.45 1 1 1h7c.55 0 1-.45 1-1v-1.5a.5.5 0 0 1 1 0V12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1.5a.5.5 0 0 1 .5-.5Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M7.5 1.5A2.5 2.5 0 0 0 5 4H3.5A2.5 2.5 0 0 0 1 6.5V8a.5.5 0 0 0 1 0V6.5A1.5 1.5 0 0 1 3.5 5H5a2.5 2.5 0 0 0 5 0h1.5A1.5 1.5 0 0 1 13 6.5V8a.5.5 0 0 0 1 0V6.5A2.5 2.5 0 0 0 11.5 4H10a2.5 2.5 0 0 0-2.5-2.5ZM6 4a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm-2.5 6A2.5 2.5 0 0 1 6 7.5h3a2.5 2.5 0 0 1 2.5 2.5v1A2.5 2.5 0 0 1 9 13.5H6A2.5 2.5 0 0 1 3.5 11v-1Z" fill="currentColor" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className="admin-nav-chevron"
      data-open={open ? "true" : "false"}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M5.25 3.5 8.75 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function buildNavGroups({
  canReadMembers,
  canManageRoles,
  canModerateCommunity,
  canManageCoaching,
  isCoachOnly,
}: AdminSidebarNavProps): AdminNavGroup[] {
  // Coaches get a focused view — just what they need
  if (isCoachOnly) {
    return [
      {
        id: "workspace",
        label: "Workspace",
        items: [
          { href: "/admin", label: "Overview", icon: "home", exact: true },
          { href: "/admin/coaching", label: "Coaching", icon: "coaching" },
        ],
      },
    ];
  }

  return [
    {
      id: "workspace",
      label: "Workspace",
      items: [
        { href: "/admin", label: "Overview", icon: "home", exact: true },
        { href: "/admin/ops", label: "Ops Health", icon: "ops" },
      ],
    },
    {
      id: "content",
      label: "Content",
      items: [
        {
          href: "/admin/months",
          label: "Practice Content",
          icon: "calendar",
          subLinks: [
            { href: "/admin/months", label: "Monthly workspaces" },
            { href: "/admin/content/calendar", label: "Coverage calendar" },
          ],
        },
        { href: "/admin/courses", label: "Courses", icon: "content" },
        {
          href: "/admin/events",
          label: "Events",
          icon: "calendar",
          subLinks: [
            { href: "/admin/events", label: "All Events" },
            { href: "/admin/events/new", label: "Add new" },
            { href: "/admin/events/types", label: "Types" },
            { href: "/admin/events/hosts", label: "Hosts" },
            { href: "/admin/events/venues", label: "Venues" },
            { href: "/admin/events/ticketing", label: "Ticketing" },
            { href: "/admin/events/attendees", label: "Attendees" },
            { href: "/admin/events/settings", label: "Settings" },
          ],
        },
      ],
    },
    {
      id: "management",
      label: "Management",
      items: [
        ...(canReadMembers ? [{ href: "/admin/members", label: "Members", icon: "members" as const }] : []),
        ...(canManageCoaching ? [{ href: "/admin/coaching", label: "Coaching", icon: "coaching" as const }] : []),
        ...(canReadMembers ? [{ href: "/admin/beta-feedback", label: "Feedback", icon: "message" as const }] : []),
        ...(canModerateCommunity ? [{ href: "/admin/community", label: "Community", icon: "community" as const }] : []),
        { href: "/admin/ingestion", label: "Ingestion", icon: "ingestion", badge: "Planned" },
        { href: "/admin/integrations", label: "Integrations", icon: "integrations" },
        ...(canManageRoles ? [{ href: "/admin/team", label: "Team", icon: "team" as const }] : []),
        ...(canManageRoles ? [{ href: "/admin/roles", label: "Roles", icon: "roles" as const }] : []),
      ],
    },
  ];
}

export function AdminSidebarNav(props: AdminSidebarNavProps) {
  const pathname = usePathname() || "/admin";
  const searchParams = useSearchParams();
  const currentEventView = searchParams.get("view") === "calendar" || searchParams.get("view") === "month" ? "calendar" : "list";
  const groups = buildNavGroups(props);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({});

  return (
    <nav className="admin-sidebar__nav" aria-label="Admin navigation">
      {groups.map((group) => {
        const activeGroup = hasActiveItem(pathname, group.items);
        const hasManualGroupState = Object.prototype.hasOwnProperty.call(openGroups, group.id);
        const groupOpen =
          activeGroup ||
          (hasManualGroupState ? Boolean(openGroups[group.id]) : group.id === "workspace");

        return (
          <div key={group.id} className="admin-nav-group">
            <button
              type="button"
              className="admin-nav-group__button"
              aria-expanded={groupOpen}
              aria-controls={`admin-nav-group-${group.id}`}
              onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !groupOpen }))}
            >
              <span>{group.label}</span>
              <Chevron open={groupOpen} />
            </button>

            {groupOpen ? (
              <div id={`admin-nav-group-${group.id}`} className="admin-nav-group__items">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item);
                  const hasChildren = Boolean(item.subLinks?.length);
                  const parentOpen = active || Boolean(openParents[item.href]);

                  return (
                    <div key={item.href} className="admin-nav-item">
                      <div className="admin-nav-parent">
                        <Link
                          href={item.href}
                          className={`admin-nav-link${active ? " admin-nav-link--active" : ""}`}
                          aria-current={active ? "page" : undefined}
                        >
                          <span className="admin-nav-link__icon"><Icon name={item.icon} /></span>
                          <span>{item.label}</span>
                          {item.badge ? (
                            <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                        {hasChildren ? (
                          <button
                            type="button"
                            className="admin-nav-parent__toggle"
                            aria-label={`${parentOpen ? "Collapse" : "Expand"} ${item.label}`}
                            aria-expanded={parentOpen}
                            aria-controls={`admin-nav-children-${item.href.replaceAll("/", "-")}`}
                            onClick={() => setOpenParents((current) => ({ ...current, [item.href]: !parentOpen }))}
                          >
                            <Chevron open={parentOpen} />
                          </button>
                        ) : null}
                      </div>

                      {hasChildren && parentOpen ? (
                        <div
                          id={`admin-nav-children-${item.href.replaceAll("/", "-")}`}
                          className="admin-nav-sublist"
                        >
                          {item.subLinks?.map((sub) => {
                            const subActive = isActiveSubLink(pathname, currentEventView, sub);
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className={`admin-nav-sublink${subActive ? " admin-nav-sublink--active" : ""}`}
                                aria-current={subActive ? "page" : undefined}
                              >
                                {sub.label}
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
