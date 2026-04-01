"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * components/member/MemberTopNav.tsx
 * Sprint 9: premium sticky top navigation bar for all member pages.
 * Sprint 10: tier-aware — Coaching link shown only for Level 3+.
 * Sprint 11: visual polish —
 *   - Backdrop blur: 12px → 16px (desktop + mobile)
 *   - Wordmark opacity: 0.65 → 0.8
 *   - Desktop active link: bg-foreground/6 → bg-primary/8 text-primary font-semibold
 *   - Mobile active link: added 2px dot indicator beneath active item
 *
 * Layout:
 *   [Positives wordmark]   [streak chip]   [Today · Library · Journal · Coaching? · Account]
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
      <header className="member-shell__nav">
        <div className="member-container flex h-14 items-center gap-4 md:h-16">
          <Link
            href="/today"
            aria-label="Positives — go to Today"
            className="mr-auto flex-shrink-0"
          >
            <span
              className="font-heading text-lg font-extrabold italic tracking-[-0.03em] text-white"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Positives
            </span>
          </Link>

          {streak > 0 && (
            <span
              className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70 md:inline-flex md:items-center md:gap-1.5"
              style={{
                color: streak >= 7 ? "var(--color-primary)" : "rgba(255,255,255,0.65)",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
              </svg>
              Day {streak}
            </span>
          )}

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
                      ? "bg-white/8 text-primary"
                      : "text-white/58 hover:bg-white/6 hover:text-white",
                  ].join(" ")}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <nav
        aria-label="Member navigation"
        className="member-shell__tabbar safe-area-pb md:hidden"
        style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
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
                    isActive ? "text-primary" : "text-white/45 hover:text-white",
                  ].join(" ")}
                >
                  <NavIcon href={href} />
                  <span>{label}</span>
                  {/* Active dot indicator */}
                  <span
                    className="block w-1 h-1 rounded-full -mt-0.5"
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
  const props = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (href === "/today") return <svg {...props}><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>;
  if (href === "/library") return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
  if (href === "/journal") return <svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
  if (href === "/coaching") return <svg {...props}><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.868v6.264a1 1 0 0 1-1.447.899L15 14"/><rect x="1" y="6" width="15" height="12" rx="2" ry="2"/></svg>;
  return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
