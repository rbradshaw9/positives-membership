import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * app/admin/layout.tsx
 * Admin-area layout with server-side email-based access guard.
 * Redirects to /dashboard if the user is not in ADMIN_EMAILS.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="min-h-dvh bg-muted flex flex-col">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-heading font-bold text-base text-foreground tracking-tight">
            Positives Admin
          </span>
          <span className="ml-3 px-2 py-0.5 rounded-sm bg-destructive/10 text-destructive text-xs font-medium">
            Internal
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{user.email}</span>
      </header>

      <div className="flex flex-1">
        {/* Sidebar nav */}
        <nav
          aria-label="Admin navigation"
          className="w-52 bg-card border-r border-border p-4 hidden sm:block"
        >
          <ul className="flex flex-col gap-1 text-sm">
            {[
              { href: "/admin", label: "Overview" },
              { href: "/admin/content", label: "Content" },
              { href: "/admin/ingestion", label: "Ingestion" },
            ].map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  className="block px-3 py-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
