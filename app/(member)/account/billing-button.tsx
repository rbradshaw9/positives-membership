import Link from "next/link";

/**
 * app/(member)/account/billing-button.tsx
 * Links to the in-app billing hub (/account/billing) — payment method,
 * invoices, and plan details. Cancellation is intentionally a separate,
 * subdued path from the billing hub.
 */

type BillingButtonProps = {
  label?: string;
  description?: string;
  showCancelLink?: boolean;
};

export function BillingButton({
  label = "Manage billing",
  description = "Payment information, invoices, and plan details",
  showCancelLink = false,
}: BillingButtonProps) {
  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/account/billing"
        className="w-full text-left bg-card rounded-2xl border border-border px-6 py-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors group"
        style={{ boxShadow: "var(--shadow-medium)" }}
        aria-label={label}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0"
          aria-hidden="true"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
      {showCancelLink && (
        <p className="text-xs text-muted-foreground text-right pr-1">
          Want to cancel?{" "}
          <Link href="/account/cancel" className="text-destructive hover:underline">
            Cancel membership
          </Link>
        </p>
      )}
    </div>
  );
}
