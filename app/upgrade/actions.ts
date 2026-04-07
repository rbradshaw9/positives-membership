"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/config";
import { config } from "@/lib/config";

/**
 * app/upgrade/actions.ts
 * Server action: swap an existing member's subscription to a new price.
 *
 * Flow:
 *   1. Verify session — must be an active member
 *   2. Look up their current subscription via Stripe API
 *   3. Update the subscription item to the new price (prorate by default)
 *   4. Redirect to /account with success param
 *
 * This does NOT create a new subscription — it modifies the existing one,
 * so the member keeps their billing anchor date and is prorated correctly.
 */

type ActionResult = { error?: string };

export async function startUpgrade(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  // 1. Auth check
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be logged in to upgrade." };
  }

  // 2. Get their Stripe customer ID and current subscription status
  const { data: member } = await supabase
    .from("member")
    .select("stripe_customer_id, subscription_status, subscription_tier")
    .eq("id", user.id)
    .single();

  if (!member?.stripe_customer_id) {
    return { error: "No billing account found. Please contact support." };
  }

  if (member.subscription_status !== "active") {
    return {
      error: "Your subscription is not active. Please contact support.",
    };
  }

  const newPriceId = (formData.get("priceId") as string | null)?.trim();
  if (!newPriceId) {
    return { error: "No plan selected. Please choose a plan and try again." };
  }

  const stripe = getStripe();

  // 3. Find their active subscription
  let subscriptionId: string;
  let subscriptionItemId: string;

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: member.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    const sub = subscriptions.data[0];
    if (!sub) {
      return {
        error: "No active subscription found. Please contact support.",
      };
    }

    subscriptionId = sub.id;
    subscriptionItemId = sub.items.data[0]?.id;

    if (!subscriptionItemId) {
      return { error: "Could not read subscription details. Please contact support." };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[upgrade] Failed to fetch subscription:", msg);
    return { error: "Could not load your subscription. Please try again." };
  }

  // 4. Update the subscription — swap to the new price, prorate immediately
  try {
    await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: "create_prorations",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[upgrade] Failed to update subscription:", msg);
    return { error: "Could not process your upgrade. Please try again." };
  }

  // 5. The Stripe webhook will fire invoice.paid → update member tier in DB.
  // Redirect to account with success indicator.
  const returnUrl = `${config.app.url}/account?upgraded=1`;
  redirect(returnUrl);
}
