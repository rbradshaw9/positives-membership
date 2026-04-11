"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(member)/account/actions";
import { Logo } from "@/components/marketing/Logo";
import { checkTierAccess } from "@/lib/auth/check-tier-access";

const BASE_NAV_ITEMS = [
  { href: "/today", label: "Home", mobileLabel: "Home" },
  { href: "/library", label: "Library" },
  { href: "/practice", label: "My Practice", mobileLabel: "Practice" },
] as const;
const COMMUNITY_NAV_ITEM = { href: "/community", label: "Q&A", mobileLabel: "Q&A" } as const;
const EVENTS_NAV_ITEM = { href: "/events", label: "Events", mobileLabel: "Events" } as const;
type NavItem = { href: string; label: string; mobileLabel?: string };

interface MemberTopNavProps {
  streak?: number;
  tier?: string | null;
  memberName?: string | null;
  communityPreviewEnabled?: boolean;
}

export function MemberTopNav({
  tier,
  memberName,
  communityPreviewEnabled = false,
}: MemberTopNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileTabRef = useRef<HTMLElement>(null);
  const displayName = memberName?.trim() || "Member";
  // Strip parenthetical suffixes (e.g. "Ryan (L1 Test)" → "Ryan") before
  // computing initials so we never get "R(" in the avatar circle.
  const cleanName = displayName.replace(/\s*\(.*?\)\s*/g, "").trim() || displayName;
  const initials = useMemo(
    () =>
      cleanName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join(""),
    [cleanName]
  );

  const hasLevel2Access = checkTierAccess(tier, "level_2");
  const navItems: NavItem[] = hasLevel2Access
    ? [BASE_NAV_ITEMS[0], BASE_NAV_ITEMS[1], COMMUNITY_NAV_ITEM, EVENTS_NAV_ITEM, BASE_NAV_ITEMS[2]]
    : communityPreviewEnabled
      ? [BASE_NAV_ITEMS[0], BASE_NAV_ITEMS[1], COMMUNITY_NAV_ITEM, BASE_NAV_ITEMS[2]]
      : [...BASE_NAV_ITEMS];

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const tabbar = mobileTabRef.current;
    const root = document.documentElement;
    if (!tabbar) return;

    const syncTabbarHeight = () => {
      const isVisible = window.matchMedia("(max-width: 767px)").matches;
      root.style.setProperty(
        "--member-tabbar-height",
        isVisible ? `${tabbar.getBoundingClientRect().height}px` : "0px"
      );
    };

    syncTabbarHeight();

    const observer = new ResizeObserver(syncTabbarHeight);
    observer.observe(tabbar);
    window.addEventListener("resize", syncTabbarHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncTabbarHeight);
    };
  }, []);

  return (
    <>
      <header className="member-shell__nav">
        <div className="member-container flex h-14 items-center gap-4 md:h-16">
          <Logo
            href="/today"
            kind="full"
            variant="light"
            height={32}
            className="mr-auto flex-shrink-0"
          />




          <nav aria-label="Member navigation" className="hidden items-center gap-1 md:flex">
            {navItems.map(({ href, label }) => {
              const isActive = pathname === href || (href !== "/today" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/9 text-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                      : "text-white/58 hover:bg-white/6 hover:text-white",
                  ].join(" ")}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-left text-white transition-colors hover:bg-white/8"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Open profile menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                {initials || "P"}
              </span>
              <span className="hidden min-w-0 md:block">
                <span className="block max-w-[8rem] truncate text-sm font-medium text-white">
                  {displayName}
                </span>
                <span className="block text-xs text-white/50">Account</span>
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="Profile menu"
                className="absolute right-0 top-full z-[70] mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#15171B] p-2 shadow-large"
              >
                <Link
                  href="/account"
                  role="menuitem"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/82 transition-colors hover:bg-white/6 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  <NavIcon href="/account" />
                  <span>Account</span>
                </Link>

                <Link
                  href="/journal"
                  role="menuitem"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/82 transition-colors hover:bg-white/6 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  <NavIcon href="/journal" />
                  <span>Journal</span>
                </Link>

                <form action={signOut}>
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/62 transition-colors hover:bg-white/6 hover:text-white"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Sign out</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav
        ref={mobileTabRef}
        aria-label="Member navigation"
        className="member-shell__tabbar safe-area-pb md:hidden"
        style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
      >
        <ul className="flex items-center justify-around px-2">
          {[...navItems, { href: "/account", label: "Account", mobileLabel: "Account" }].map(
            ({ href, label, mobileLabel }) => {
            const isActive = pathname === href || (href !== "/today" && pathname.startsWith(href));
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "flex flex-col items-center gap-1 px-2 py-3 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    isActive ? "text-primary" : "text-white/45 hover:text-white",
                  ].join(" ")}
                >
                  <NavIcon href={href} />
                  <span>{mobileLabel ?? label}</span>
                  <span
                    className="block h-1 w-1 rounded-full -mt-0.5"
                    style={{ background: isActive ? "var(--color-primary)" : "transparent" }}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function NavIcon({ href }: { href: string }) {
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (href === "/today") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    );
  }

  if (href === "/library") {
    return (
      <svg {...props}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  }

  if (href === "/community") {
    return (
      <svg {...props}>
        <path d="M7 10h10" />
        <path d="M7 14h6" />
        <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5z" />
      </svg>
    );
  }

  if (href === "/events") {
    return (
      <svg {...props}>
        <rect x="3" y="5" width="18" height="16" rx="2" ry="2" />
        <line x1="16" y1="3" x2="16" y2="7" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="3" y1="11" x2="21" y2="11" />
        <path d="M8 15h8" />
      </svg>
    );
  }

  if (href === "/practice") {
    return (
      <svg {...props}>
        <path d="M12 3v18" />
        <path d="M5 9a7 7 0 0 1 14 0" />
        <path d="M19 15a7 7 0 0 1-14 0" />
      </svg>
    );
  }

  if (href === "/journal") {
    return (
      <svg {...props}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    );
  }

  if (href === "/coaching") {
    return (
      <svg {...props}>
        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.868v6.264a1 1 0 0 1-1.447.899L15 14" />
        <rect x="1" y="6" width="15" height="12" rx="2" ry="2" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
