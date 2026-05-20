"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/analytics/ga";

type BillingButtonProps = {
  label?: string;
  description?: string;
  showCancelLink?: boolean;
};

export function BillingButton({
  label = "Open billing center",
  description = "Update payment method and view invoices",
  showCancelLink = true,
}: BillingButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/stripe/billing-portal", { method: "POST" });
    const data = await res.json();
    if (data?.url) {
      track("billing_portal_opened", {
        source_path: "/account",
      });
      window.location.href = data.url;
    } else if (data?.code === "billing_unavailable") {
      router.replace("/account?error=billing_unavailable");
    } else {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full text-left bg-card rounded-2xl border border-border px-6 py-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors group disabled:opacity-50"
        style={{ boxShadow: "var(--shadow-medium)" }}
        aria-label={label}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">
            {loading ? "Loading..." : label}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
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
      </button>
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
