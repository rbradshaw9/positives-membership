"use client";

import { useTransition } from "react";
import { redirectToBillingPortal } from "./actions";

/**
 * BillingButton — triggers the Stripe Customer Portal redirect.
 * Client component so we can show a pending state.
 * The action itself is a server action that calls redirect() on success.
 */
export function BillingButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await redirectToBillingPortal();
    });
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-soft p-5 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">Manage billing</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          View invoices, update payment method, or cancel.
        </p>
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex-shrink-0 text-sm font-medium text-primary hover:text-primary-hover transition-colors disabled:opacity-50 ml-4"
      >
        {isPending ? "Opening…" : "Billing →"}
      </button>
    </div>
  );
}
