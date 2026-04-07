import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * app/admin/layout.tsx
 * Admin-area layout — redesigned with dark sidebar + brand identity.
 * Server-side email-based access guard via requireAdmin().
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  const navItems = [
    {
      href: "/admin",
      label: "Overview",
      icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.07926 0.222253C7.31275 -0.007434 7.6873 -0.007434 7.92079 0.222253L14.6708 6.86227C14.907 7.09465 14.907 7.47322 14.6708 7.70559C14.4345 7.93797 14.0541 7.93797 13.8179 7.70559L7.50002 1.50016L1.18215 7.70559C0.945926 7.93797 0.565573 7.93797 0.329344 7.70559C0.0931149 7.47322 0.0931149 7.09465 0.329344 6.86227L7.07926 0.222253ZM7.50002 3.50016L13.5 9.50016V14.5002C13.5 14.7763 13.2762 15.0002 13 15.0002H10C9.72386 15.0002 9.50002 14.7763 9.50002 14.5002V11.5002H5.50002V14.5002C5.50002 14.7763 5.27617 15.0002 5.00002 15.0002H2.00002C1.72386 15.0002 1.50002 14.7763 1.50002 14.5002V9.50016L7.50002 3.50016Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
        </svg>
      ),
    },
  ];

  const contentItems = [
    {
      href: "/admin/months",
      label: "Monthly Setup",
      subLinks: [
        { href: "/admin/months", label: "View All" },
        { href: "/admin/months/new", label: "Add New" },
      ],
      icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4.5 1C4.22386 1 4 1.22386 4 1.5V2H3C2.17157 2 1.5 2.67157 1.5 3.5V12.5C1.5 13.3284 2.17157 14 3 14H12C12.8284 14 13.5 13.3284 13.5 12.5V3.5C13.5 2.67157 12.8284 2 12 2H11V1.5C11 1.22386 10.7761 1 10.5 1C10.2239 1 10 1.22386 10 1.5V2H5V1.5C5 1.22386 4.77614 1 4.5 1ZM5 3V3.5C5 3.77614 5.22386 4 5.5 4C5.77614 4 6 3.77614 6 3.5V3H9V3.5C9 3.77614 9.22386 4 9.5 4C9.77614 4 10 3.77614 10 3.5V3H11C11.8284 3 12.5 3.67157 12.5 4.5V5H2.5V4.5C2.5 3.67157 3.17157 3 4 3H5ZM2.5 6H12.5V12.5C12.5 12.7761 12.2761 13 12 13H3C2.72386 13 2.5 12.7761 2.5 12.5V6Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
        </svg>
      ),
    },
    {
      href: "/admin/courses",
      label: "Courses",
      subLinks: [
        { href: "/admin/courses", label: "View All" },
        { href: "/admin/courses/new", label: "Add New" },
      ],
      icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 3.5C2 3.22386 2.22386 3 2.5 3H12.5C12.7761 3 13 3.22386 13 3.5V9.5C13 9.77614 12.7761 10 12.5 10H2.5C2.22386 10 2 9.77614 2 9.5V3.5ZM2.5 2C1.67157 2 1 2.67157 1 3.5V9.5C1 10.3284 1.67157 11 2.5 11H7V12H4.5C4.22386 12 4 12.2239 4 12.5C4 12.7761 4.22386 13 4.5 13H10.5C10.7761 13 11 12.7761 11 12.5C11 12.2239 10.7761 12 10.5 12H8V11H12.5C13.3284 11 14 10.3284 14 9.5V3.5C14 2.67157 13.3284 2 12.5 2H2.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
        </svg>
      ),
    },
  ];

  const managementItems = [
    {
      href: "/admin/members",
      label: "Members",
      icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.5 0.875C5.49797 0.875 3.875 2.49797 3.875 4.5C3.875 6.15288 4.98124 7.54738 6.49373 7.98351L5.42128 13.2907C5.36683 13.5613 5.54851 13.8267 5.81912 13.882C6.08974 13.9373 6.35494 13.7557 6.40939 13.485L7.5 7.99414L8.59061 13.485C8.64506 13.7557 8.91026 13.9373 9.18088 13.882C9.45149 13.8267 9.63317 13.5613 9.57872 13.2907L8.50627 7.98351C10.0188 7.54738 11.125 6.15288 11.125 4.5C11.125 2.49797 9.50203 0.875 7.5 0.875ZM4.875 4.5C4.875 3.05025 6.05025 1.875 7.5 1.875C8.94975 1.875 10.125 3.05025 10.125 4.5C10.125 5.94975 8.94975 7.125 7.5 7.125C6.05025 7.125 4.875 5.94975 4.875 4.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
        </svg>
      ),
    },
    {
      href: "/admin/ingestion",
      label: "Ingestion",
      icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.81825 1.18188C7.64251 1.00615 7.35759 1.00615 7.18185 1.18188L4.18185 4.18188C4.00611 4.35762 4.00611 4.64254 4.18185 4.81828C4.35759 4.99401 4.64251 4.99401 4.81825 4.81828L7.05005 2.58648V9.49996C7.05005 9.74849 7.25152 9.94996 7.50005 9.94996C7.74858 9.94996 7.95005 9.74849 7.95005 9.49996V2.58648L10.1819 4.81828C10.3576 4.99401 10.6425 4.99401 10.8182 4.81828C10.994 4.64254 10.994 4.35762 10.8182 4.18188L7.81825 1.18188ZM2.5 9.99997C2.77614 9.99997 3 10.2238 3 10.5V12C3 12.5538 3.44565 13 4 13H11C11.5538 13 12 12.5538 12 12V10.5C12 10.2238 12.2239 9.99997 12.5 9.99997C12.7761 9.99997 13 10.2238 13 10.5V12C13 13.1046 12.1046 14 11 14H4C2.89543 14 2 13.1046 2 12V10.5C2 10.2238 2.22386 9.99997 2.5 9.99997Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="admin-shell">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="admin-sidebar hidden sm:flex flex-col">
        {/* Logo / wordmark */}
        <div className="admin-sidebar__logo">
          <div className="admin-sidebar__logo-mark">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="9" r="9" fill="url(#admin-logo-grad)"/>
              <path d="M6 9.5L8.2 11.5L12 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="admin-logo-grad" x1="0" y1="0" x2="18" y2="18" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2EC4B6"/>
                  <stop offset="1" stopColor="#44A8D8"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="admin-sidebar__logo-text">Positives</span>
          <span className="admin-sidebar__badge">Admin</span>
        </div>

        {/* Nav ─────────────────────────────────────────────────────────── */}
        <nav className="admin-sidebar__nav" aria-label="Admin navigation">
          {/* Main */}
          {navItems.map((item) => (
            <AdminNavLink key={item.href} href={item.href} icon={item.icon} exact>
              {item.label}
            </AdminNavLink>
          ))}

          {/* Content section */}
          <p className="admin-nav-section-label">Content</p>
          {contentItems.map((item) => (
            <div key={item.href}>
              <AdminNavLink href={item.href} icon={item.icon}>
                {item.label}
              </AdminNavLink>
              {item.subLinks && (
                <div style={{ paddingLeft: "2rem", display: "flex", flexDirection: "column", gap: "0.125rem", marginTop: "-0.125rem", marginBottom: "0.25rem" }}>
                  {item.subLinks.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      style={{
                        fontSize: "0.6875rem",
                        color: "var(--color-muted-fg)",
                        textDecoration: "none",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.25rem",
                        transition: "color 120ms ease",
                      }}
                      className="admin-nav-sublink"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Management section */}
          <p className="admin-nav-section-label">Management</p>
          {managementItems.map((item) => (
            <AdminNavLink key={item.href} href={item.href} icon={item.icon}>
              {item.label}
            </AdminNavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__avatar">
            {user.email?.charAt(0).toUpperCase()}
          </div>
          <span className="admin-sidebar__user-email">{user.email}</span>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="admin-main">
        {/* Mobile top bar */}
        <header className="admin-mobile-header sm:hidden">
          <span className="font-heading font-bold text-sm text-foreground">
            Positives
          </span>
          <span className="admin-sidebar__badge">Admin</span>
        </header>

        {/* Page content */}
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Server-rendered nav link helper.
 * We can't use usePathname in a server component, so we use a simple
 * structural component — active styling is applied via CSS :has() trick
 * or deferred to client. For simplicity, we render with full hover states
 * and let the browser handle .admin-nav-link styling.
 */
function AdminNavLink({
  href,
  icon,
  children,
  indent,
  exact,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  indent?: boolean;
  exact?: boolean;
}) {
  void exact;
  return (
    <Link
      href={href}
      className={`admin-nav-link${indent ? " admin-nav-link--indent" : ""}`}
    >
      <span className="admin-nav-link__icon">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
