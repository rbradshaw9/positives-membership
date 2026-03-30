import Link from "next/link";

/**
 * app/(marketing)/page.tsx
 * Marketing homepage — Milestone 01 placeholder.
 * Will be replaced with full marketing page in a later milestone.
 */
export default function MarketingHomePage() {
  return (
    <section className="flex flex-col items-center justify-center min-h-[80dvh] px-6 py-16 text-center">
      <span className="inline-block px-3 py-1 rounded-pill bg-primary/10 text-primary text-xs font-medium mb-6 tracking-wide uppercase">
        A daily practice
      </span>
      <h1 className="font-heading font-bold text-4xl sm:text-5xl text-foreground max-w-xl leading-heading tracking-[-0.03em] mb-5">
        Calm, clarity, and resilience — every day.
      </h1>
      <p className="text-muted-foreground text-lg max-w-md leading-body mb-10">
        Positives is a practice-based membership for people who want to feel
        better, more grounded, and more emotionally resilient.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-6 py-3 rounded bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft"
        >
          Start your practice
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-6 py-3 rounded border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors"
        >
          Sign in
        </Link>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        Regular price: <span className="line-through">$97/month</span>
        {" "}—{" "}
        <span className="text-foreground font-medium">$49/month</span>
      </p>
    </section>
  );
}
