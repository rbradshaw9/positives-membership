import Link from "next/link";

export const metadata = {
  title: "Membership Activated — Positives",
  description: "Thank you for joining Positives.",
};

/**
 * app/subscribe/success/page.tsx
 * Return page shown after Stripe Checkout completes.
 *
 * Important: this page does NOT assume the webhook has already fired.
 * Stripe Checkout completing does not mean the member row is updated yet.
 * The webhook handles subscription_status — this page explains that
 * access may take a moment and invites the member to proceed.
 *
 * Server-side access control on /today handles the actual gate.
 */
export default function SubscribeSuccessPage() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <span className="block font-heading font-bold text-2xl tracking-tight mb-1 text-foreground">
          Positives
        </span>

        <div className="bg-card rounded-lg border border-border shadow-soft p-6 mb-6 text-left mt-8">
          <div className="mb-4">
            {/* Calm visual marker */}
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-3">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <h1 className="font-heading font-semibold text-lg text-foreground leading-heading">
              Welcome to Positives
            </h1>
          </div>

          <p className="text-sm text-muted-foreground leading-body mb-3">
            Your payment is being confirmed. It may take a moment for your
            membership access to activate.
          </p>
          <p className="text-sm text-muted-foreground leading-body">
            If your access isn&apos;t ready immediately, wait a few seconds and
            try again — billing confirmation happens automatically.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/today"
            className="inline-flex items-center justify-center px-6 py-3 rounded bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft w-full"
          >
            Go to Today&apos;s Practice
          </Link>

          <Link
            href="/subscribe"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Having trouble? Return to membership page
          </Link>
        </div>
      </div>
    </div>
  );
}
