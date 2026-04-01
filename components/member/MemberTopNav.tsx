"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

/**
 * components/member/MemberTopNav.tsx
 * Sprint 9: premium sticky top navigation bar for all member pages.
 * Sprint 10: tier-aware — Coaching link shown only for Level 3+.
 *
 * Layout:
 *   [Positives wordmark]   [streak chip]   [Today · Library · Journal · Coaching? · Account]
 *
 * Design:
 *   - White/card background with subtle border-b
 *   - h-14 on mobile, h-16 on desktop
 *   - nav links are text links (no icons on desktop, icons-only on mobile via
 *     a responsive bottom bar that this component also renders)
 *
 * Accessibility: aria-current="page" on active link.
 */

const COACHING_TIERS = new Set(["level_3", "level_4"]);

const BASE_NAV_ITEMS = [
  { href: "/today",   label: "Today"   },
  { href: "/library", label: "Library" },
  { href: "/journal", label: "Journal" },
] as const;

const ACCOUNT_NAV_ITEM = { href: "/account", label: "Account" } as const;
const COACHING_NAV_ITEM = { href: "/coaching", label: "Coaching" } as const;

type NavItem = { href: string; label: string };

interface MemberTopNavProps {
  streak?: number;
  tier?: string | null;
}

export function MemberTopNav({ streak = 0, tier }: MemberTopNavProps) {
  const pathname = usePathname();
  const showCoaching = COACHING_TIERS.has(tier ?? "");

  const navItems: NavItem[] = [
    ...BASE_NAV_ITEMS,
    ...(showCoaching ? [COACHING_NAV_ITEM] : []),
    ACCOUNT_NAV_ITEM,
  ];

  return (
    <>
      {/* ── Desktop + tablet top bar ─────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 w-full border-b border-border bg-card/90"
        style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <div className="member-container flex items-center h-14 md:h-16 gap-6">
          {/* Wordmark */}
          <Link href="/today" aria-label="Positives — go to Today" className="flex-shrink-0 mr-auto md:mr-0">
            <Image
              src="/logos/positives-wordmark-dark.png"
              alt="Positives"
              width={100}
              height={22}
              style={{ height: 18, width: "auto", opacity: 0.65 }}
              priority
            />
          </Link>

          {/* Streak chip — centred area */}
          {streak > 0 && (
            <span
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ml-auto"
              style={{
                color: streak >= 7 ? "var(--color-secondary)" : "var(--color-muted-fg)",
                background: streak >= 7 ? "color-mix(in srgb, var(--color-secondary) 10%, transparent)" : "var(--color-muted)",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
              </svg>
              Day {streak}
            </span>
          )}

          {/* Nav links — hidden on mobile, shown on md+ */}
          <nav
            aria-label="Member navigation"
            className="hidden md:flex items-center gap-0.5"
          >
            {navItems.map(({ href, label }) => {
              const isActive = pathname === href || (href !== "/today" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "px-3.5 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "text-foreground bg-foreground/6"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/4",
                  ].join(" ")}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── Mobile bottom bar ─────────────────────────────────────────── */}
      {/* Shown only on mobile (md:hidden) — icons + labels */}
      <nav
        aria-label="Member navigation"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 border-t border-border"
        style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex items-center justify-around px-2">
          {navItems.map(({ href, label }) => {
            const isActive = pathname === href || (href !== "/today" && pathname.startsWith(href));
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "flex flex-col items-center gap-1 py-3 px-2 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  <NavIcon href={href} />
                  <span>{label}</span>
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
  const props = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (href === "/today") return <svg {...props}><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>;
  if (href === "/library") return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
  if (href === "/journal") return <svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
  if (href === "/coaching") return <svg {...props}><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.868v6.264a1 1 0 0 1-1.447.899L15 14"/><rect x="1" y="6" width="15" height="12" rx="2" ry="2"/></svg>;
  return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
