import Link from "next/link";

/**
 * app/(marketing)/layout.tsx
 * Marketing layout — wraps the public-facing pages.
 * Minimal by design at Milestone 01.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-card">
        <Link href="/" className="font-heading font-bold text-lg tracking-tight text-foreground">
          Positives
        </Link>
        <nav className="flex gap-4 items-center text-sm">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
