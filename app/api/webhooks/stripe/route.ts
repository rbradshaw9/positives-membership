import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/config";
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentFailed,
  handlePaymentSucceeded,
  handleTrialWillEnd,
} from "@/server/services/stripe/handle-subscription";
import { handleCheckoutSessionCompleted } from "@/server/services/stripe/handle-checkout";
import {
  handleChargeRefunded,
  handleDisputeClosed,
} from "@/server/services/stripe/handle-course-entitlements";

/**
 * app/api/webhooks/stripe/route.ts
 * Stripe webhook endpoint.
 *
 * Verifies the Stripe-Signature header before processing any event.
 * This endpoint must receive the raw request body — Next.js passes it
 * automatically for route handlers.
 *
 * Events handled:
 *   checkout.session.completed      → activate member + ensure customer link
 *   customer.subscription.created   → set status + tier from subscription
 *   customer.subscription.updated   → update status + tier
 *   customer.subscription.deleted   → mark canceled
 *   customer.subscription.trial_will_end → send trial reminder email
 *   invoice.payment_succeeded       → send receipt email
 *   invoice.payment_failed          → mark past_due + send payment-failed email
 *   charge.refunded                 → mark matching course entitlement refunded
 *   charge.dispute.closed           → mark matching course entitlement chargeback if lost
 *
 * Configure your Stripe webhook to point to:
 *   https://positives.life/api/webhooks/stripe
 *
 * Required Stripe event subscriptions:
 *   checkout.session.completed
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   customer.subscription.trial_will_end
 *   invoice.payment_succeeded
 *   invoice.payment_failed
 *   charge.refunded
 *   charge.dispute.closed
 */
export async function POST(request: Request) {
  const body = await request.text();
  const headerStore = await headers();
  const signature = headerStore.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json(
      { error: "Webhook secret not configured." },
      { status: 500 }
    );
  }

  if (!signature) {
    console.warn("[Stripe Webhook] Request received with no stripe-signature header.");
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  console.log(`[Stripe Webhook] Received verified event: ${event.type} (id: ${event.id})`);

  // Route verified events to their handlers
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case "charge.dispute.closed":
        await handleDisputeClosed(event.data.object as Stripe.Dispute);
        break;

      default:
        // Unhandled event type — log and return 200 so Stripe doesn't retry
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[Stripe Webhook] Handler error for ${event.type} (id: ${event.id}):`,
      message
    );
    return NextResponse.json(
      { error: "Internal handler error." },
      { status: 500 }
    );
  }

  console.log(`[Stripe Webhook] Successfully processed: ${event.type} (id: ${event.id})`);
  return NextResponse.json({ received: true }, { status: 200 });
}
