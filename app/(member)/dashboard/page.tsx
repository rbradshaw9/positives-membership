import Link from "next/link";

/**
 * app/(member)/dashboard/page.tsx
 * Member dashboard shell — Milestone 01.
 * Shows greeting and primary navigation cards.
 */
export default function DashboardPage() {
  return (
    <div className="px-5 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <p className="text-muted-foreground text-sm mb-1">Welcome back</p>
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.03em]">
          Your practice
        </h1>
      </header>

      <section className="flex flex-col gap-4">
        <Link
          href="/today"
          className="group block bg-card rounded-lg shadow-soft border border-border p-5 hover:shadow-medium transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              Daily
            </span>
          </div>
          <h2 className="font-heading font-semibold text-lg text-foreground mb-1 leading-heading">
            Today&apos;s Practice
          </h2>
          <p className="text-sm text-muted-foreground leading-body">
            Your daily grounding audio is ready.
          </p>
        </Link>

        <Link
          href="/library"
          className="group block bg-card rounded-lg shadow-soft border border-border p-5 hover:shadow-medium transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-secondary uppercase tracking-wide">
              Library
            </span>
          </div>
          <h2 className="font-heading font-semibold text-lg text-foreground mb-1 leading-heading">
            Content Library
          </h2>
          <p className="text-sm text-muted-foreground leading-body">
            Browse all audio, principles, and monthly themes.
          </p>
        </Link>

        <Link
          href="/journal"
          className="group block bg-card rounded-lg shadow-soft border border-border p-5 hover:shadow-medium transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-accent uppercase tracking-wide">
              Journal
            </span>
          </div>
          <h2 className="font-heading font-semibold text-lg text-foreground mb-1 leading-heading">
            Reflections
          </h2>
          <p className="text-sm text-muted-foreground leading-body">
            Your private journal and past reflections.
          </p>
        </Link>
      </section>
    </div>
  );
}
