"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

/**
 * app/account/billing/billing-client.tsx
 *
 * Card-on-file display + in-page card update via Stripe Payment Element.
 *
 * Flow:
 *   1. Show current card (or "no card on file")
 *   2. "Update card" → POST /api/stripe/setup-intent → clientSecret
 *   3. Render <PaymentElement> inside <Elements>
 *   4. confirmSetup (handles 3DS) → POST /api/stripe/set-default-payment-method
 *   5. router.refresh() to show the new card
 */

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

type CardOnFile = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
} | null;

type Props = {
  currentCard: CardOnFile;
  token: string | null;
};

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

export function BillingClient({ currentCard, token }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Handle return from a 3DS redirect: Stripe appends ?setup_intent=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const si = params.get("setup_intent");
    const status = params.get("redirect_status");
    if (si && status === "succeeded") {
      // Finalise: set the just-confirmed card as default
      void finalizeCard(si, token).then((ok) => {
        if (ok) {
          // Strip the Stripe params and refresh
          const clean = new URL(window.location.href);
          ["setup_intent", "setup_intent_client_secret", "redirect_status"].forEach((k) =>
            clean.searchParams.delete(k)
          );
          window.history.replaceState({}, "", clean.toString());
          router.refresh();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startUpdate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start card update");
      setClientSecret(data.clientSecret);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (clientSecret) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#2F6FED",
              borderRadius: "10px",
              fontFamily: "system-ui, sans-serif",
            },
          },
        }}
      >
        <CardForm token={token} onCancel={() => setClientSecret(null)} />
      </Elements>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {currentCard ? (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-11 h-7 rounded-md border border-border bg-surface-tint/50 flex items-center justify-center">
            <svg width="20" height="14" viewBox="0 0 24 16" fill="none" aria-hidden="true">
              <rect x="0.5" y="0.5" width="23" height="15" rx="2" stroke="#9AA0A8" />
              <rect x="3" y="10" width="8" height="2" rx="1" fill="#9AA0A8" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {BRAND_LABEL[currentCard.brand] ?? currentCard.brand} ending {currentCard.last4}
            </p>
            <p className="text-xs text-muted-foreground">
              Expires {String(currentCard.expMonth).padStart(2, "0")}/{currentCard.expYear}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No card on file.</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={startUpdate}
        disabled={loading}
        className="self-start rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
          boxShadow: "0 4px 14px rgba(47,111,237,0.22)",
        }}
      >
        {loading ? "Loading…" : currentCard ? "Update card" : "Add a card"}
      </button>
    </div>
  );
}

function CardForm({
  token,
  onCancel,
}: {
  token: string | null;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const returnUrl = new URL(window.location.href);
    if (token) returnUrl.searchParams.set("token", token);

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: returnUrl.toString() },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Your card could not be saved.");
      setSubmitting(false);
      return;
    }

    // No 3DS redirect needed — finalise inline
    if (setupIntent?.status === "succeeded") {
      const ok = await finalizeCard(setupIntent.id, token);
      if (!ok) {
        setError("Card saved but could not be set as default. Contact support.");
        setSubmitting(false);
        return;
      }
      router.refresh();
      return;
    }

    setError("Card confirmation didn't complete. Please try again.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
            boxShadow: "0 4px 14px rgba(47,111,237,0.22)",
          }}
        >
          {submitting ? "Saving…" : "Save card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-full px-5 py-2.5 text-sm font-medium border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

async function finalizeCard(setupIntentId: string, token: string | null): Promise<boolean> {
  try {
    const res = await fetch("/api/stripe/set-default-payment-method", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, setupIntentId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
