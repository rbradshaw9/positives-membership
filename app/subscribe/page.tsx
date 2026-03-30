import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createCheckoutSession } from "@/server/services/stripe/create-checkout-session";

export const metadata = {
  title: "Activate Your Membership — Positives",
  description: "Your Positives membership is not currently active.",
};

/**
 * app/subscribe/page.tsx
 * Destination for authenticated users who do not have an active subscription.
 *
 * Shown when:
 * - User signed up but has not purchased a subscription
 * - Subscription was canceled or is past_due
 *
 * The "Start membership" button triggers a Server Action that:
 * 1. Resolves or creates a Stripe customer (idempotent)
 * 2. Creates a Stripe Checkout Session
 * 3. Redirects server-side to the Stripe-hosted checkout page
 *
 * Access control is NOT relaxed on checkout redirect — the webhook
 * fires after payment and updates member.subscription_status.
 */
export default async function SubscribePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated users should not reach this page — redirect to login.
  if (!user) {
    redirect("/login");
  }

  // Server Action — called when the checkout form is submitted.
  // Runs entirely on the server; no client JS needed.
  async function startCheckout() {
    "use server";

    const sb = await createClient();
    const {
      data: { user: currentUser },
    } = await sb.auth.getUser();

    if (!currentUser?.email) {
      redirect("/login");
    }

    try {
      const { url } = await createCheckoutSession(
        currentUser.id,
        currentUser.email
      );
      redirect(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown checkout error";
      console.error("[subscribe] Checkout creation failed:", message);
      // Redirect back with error param so the UI can surface it if needed
      redirect("/subscribe?error=checkout_failed");
    }
  }

  async function signOut() {
    "use server";
    const sb = await createClient();
    await sb.auth.signOut();
    redirect("/login");
  }

  const hasCheckoutError =
    typeof globalThis !== "undefined" &&
    false; // Resolved at render time via searchParams if needed

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <span className="block font-heading font-bold text-2xl tracking-tight mb-1 text-foreground">
          Positives
        </span>
        <p className="text-muted-foreground text-xs mb-10">
          Signed in as {user.email}
        </p>

        <div className="bg-card rounded-lg border border-border shadow-soft p-6 mb-6 text-left">
          <h1 className="font-heading font-semibold text-lg text-foreground mb-2 leading-heading">
            Your membership is not active
          </h1>
          <p className="text-sm text-muted-foreground leading-body mb-4">
            To access your daily practice, weekly principles, and content
            library, you need an active Positives membership.
          </p>

          {/* Level 1 membership summary */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium text-foreground mb-1">
              Level 1 — Membership
            </p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• Daily grounding audio from Dr. Paul</li>
              <li>• Weekly principles and practices</li>
              <li>• Monthly themes for reflection</li>
              <li>• Private member podcast feed</li>
            </ul>
            <p className="text-sm font-semibold text-foreground mt-3">
              $49<span className="text-xs font-normal text-muted-foreground">/month</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Checkout — Server Action, no client JS */}
          <form action={startCheckout}>
            <button
              type="submit"
              className="w-full px-6 py-3 rounded bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft"
            >
              Start membership →
            </button>
          </form>

          <form action={signOut}>
            <button
              type="submit"
              className="w-full px-6 py-3 rounded border border-border text-muted-foreground font-medium text-sm hover:text-foreground hover:bg-muted transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Secure checkout powered by Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
