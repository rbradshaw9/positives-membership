import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/**
 * server/services/stripe/handle-checkout.ts
 * Handler for checkout.session.completed webhook events.
 *
 * Why this exists:
 * The subscription.created handler updates the member row by looking up
 * stripe_customer_id. If that ID failed to persist during checkout session
 * creation (network blip, DB write error), the subscription event silently
 * updates 0 rows and the member never gets access.
 *
 * checkout.session.completed fires before subscription.created and carries
 * both the customer ID and the client_reference_id (userId). This handler:
 *   1. Ensures stripe_customer_id is written to the member row
 *   2. Sets subscription_status → "active" as an immediate signal
 *
 * The subsequent subscription.created/updated events are still handled
 * and will overwrite with the full tier + end_date — this is safe and
 * idempotent. checkout.session.completed is the reliability backstop.
 */

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const customerId =
    typeof session.customer === "string" ? session.customer : null;

  // client_reference_id is set via subscription_data.metadata.userId
  // in create-checkout-session.ts. Fall back to session.metadata.userId.
  const userId =
    session.client_reference_id ??
    session.metadata?.userId ??
    null;

  console.log(
    `[Stripe] checkout.session.completed — session: ${session.id}, customer: ${customerId ?? "none"}, userId: ${userId ?? "none"}`
  );

  if (!customerId) {
    console.error(
      `[Stripe] checkout.session.completed has no customer ID — session: ${session.id}. ` +
        `Member cannot be activated. Check Stripe session configuration.`
    );
    return;
  }

  const supabase = getAdminClient();

  // ── Strategy A: look up by userId (most reliable) ────────────────────────
  if (userId) {
    const { data: member, error: lookupError } = await supabase
      .from("member")
      .select("id, stripe_customer_id, subscription_status")
      .eq("id", userId)
      .single();

    if (lookupError || !member) {
      console.error(
        `[Stripe] checkout.session.completed — member row not found for userId: ${userId}. ` +
          `Auth trigger may not have run yet. Falling back to customer lookup.`
      );
      // Fall through to Strategy B
    } else {
      const updates: Record<string, string> = {
        subscription_status: "active",
      };

      if (!member.stripe_customer_id) {
        updates.stripe_customer_id = customerId;
        console.log(
          `[Stripe] Writing missing stripe_customer_id to member row — userId: ${userId}, customerId: ${customerId}`
        );
      }

      const { error: updateError } = await supabase
        .from("member")
        .update(updates)
        .eq("id", userId);

      if (updateError) {
        throw new Error(
          `[Stripe] Failed to activate member for userId ${userId}: ${updateError.message}`
        );
      }

      console.log(
        `[Stripe] Member activated via checkout — userId: ${userId}, customerId: ${customerId}`
      );
      return;
    }
  }

  // ── Strategy B: look up by stripe_customer_id (fallback) ─────────────────
  const { data: memberByCustomer, error: customerLookupError } = await supabase
    .from("member")
    .select("id, subscription_status")
    .eq("stripe_customer_id", customerId)
    .single();

  if (customerLookupError || !memberByCustomer) {
    console.error(
      `[Stripe] checkout.session.completed — could not find member by customerId: ${customerId}. ` +
        `Member will not be activated. Manual intervention required.`
    );
    return;
  }

  const { error: fallbackUpdateError } = await supabase
    .from("member")
    .update({ subscription_status: "active" })
    .eq("stripe_customer_id", customerId);

  if (fallbackUpdateError) {
    throw new Error(
      `[Stripe] Failed to activate member via fallback for customerId ${customerId}: ${fallbackUpdateError.message}`
    );
  }

  console.log(
    `[Stripe] Member activated via checkout (fallback path) — customerId: ${customerId}`
  );
}
