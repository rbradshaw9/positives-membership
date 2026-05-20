"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

/**
 * app/account/billing/billing-client.tsx
 *
 * Card-on-file display + in-page card update.
 *
 * Uses Stripe's Card Element — a single, card-only input (number, expiry,
 * CVC, ZIP). No accordion, no Link, no bank options — the right tool for
 * a "update your card" flow. 3DS is handled inline by confirmCardSetup.
 *
 * Flow:
 *   1. Show current card (or "no card on file")
 *   2. "Update card" → POST /api/stripe/setup-intent → clientSecret
 *   3. CardElement → confirmCardSetup (handles 3DS inline)
 *   4. POST /api/stripe/set-default-payment-method
 *   5. router.refresh()
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
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-4">
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

      {editing ? (
        <Elements stripe={stripePromise}>
          <CardForm
            token={token}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </Elements>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="self-start rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
            boxShadow: "0 4px 14px rgba(47,111,237,0.22)",
          }}
        >
          {currentCard ? "Update card" : "Add a card"}
        </button>
      )}
    </div>
  );
}

function CardForm({
  token,
  onDone,
  onCancel,
}: {
  token: string | null;
  onDone: () => void;
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

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create the SetupIntent
      const siRes = await fetch("/api/stripe/setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const siData = await siRes.json();
      if (!siRes.ok) throw new Error(siData.error ?? "Could not start card update");

      // 2. Confirm the card (handles 3DS inline)
      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
        siData.clientSecret,
        { payment_method: { card: cardElement } }
      );
      if (confirmError) {
        throw new Error(confirmError.message ?? "Your card could not be saved.");
      }
      if (setupIntent?.status !== "succeeded") {
        throw new Error("Card confirmation didn't complete. Please try again.");
      }

      // 3. Set it as the default for the customer + subscription
      const setRes = await fetch("/api/stripe/set-default-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, setupIntentId: setupIntent.id }),
      });
      if (!setRes.ok) {
        throw new Error("Card saved but could not be set as default. Contact support.");
      }

      onDone();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-background px-4 py-3.5">
        <CardElement
          options={{
            hidePostalCode: false,
            style: {
              base: {
                fontSize: "15px",
                color: "#121417",
                fontFamily: "system-ui, sans-serif",
                "::placeholder": { color: "#9AA0A8" },
              },
              invalid: { color: "#dc2626" },
            },
          }}
        />
      </div>

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
