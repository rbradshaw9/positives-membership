"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getStripe } from "@/lib/stripe/config";
import { config } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

/**
 * app/admin/members/[id]/assign-l4/actions.ts
 *
 * Package types:
 *
 *   pay_in_full   — Single invoice ($4,500 default, editable). Not a subscription.
 *   three_pay     — $1,500/month × 3. Stripe subscription with cancel_at = 90 days.
 *   saved_price   — Admin selected an existing Stripe Price from the L4 product library.
 *                   Subscription created using that Price ID directly.
 *   custom        — Admin defines amount + interval + cycles + nickname.
 *                   A new Stripe Price is created on the L4 product (with nickname and
 *                   cycles metadata) so it appears as a saved option for future calls.
 *                   Subscription is then created with that Price.
 *
 * Stripe Prices are the canonical store for reusable packages.
 * No separate database table needed.
 */

export type PackageType = "pay_in_full" | "three_pay" | "saved_price" | "custom";

type ActionResult = { error?: string };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function setMemberTierL4(memberId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("member")
    .update({ subscription_tier: "level_4", subscription_status: "active" })
    .eq("id", memberId);
  if (error) console.error("[admin/assign-l4] DB update failed:", error.message);
}

function cancelAtFromSeconds(seconds: number): number {
  return Math.floor(Date.now() / 1000) + seconds;
}

const INTERVAL_SECONDS: Record<string, number> = {
  monthly:   30  * 24 * 3600,
  quarterly: 91  * 24 * 3600,
  annual:    365 * 24 * 3600,
};

async function createInvoice(
  stripe: Stripe,
  customerId: string,
  amountCents: number,
  description: string,
  adminNote: string,
  collectAuto: boolean
) {
  await stripe.invoiceItems.create({ customer: customerId, amount: amountCents, currency: "usd", description });

  const base: Record<string, unknown> = {
    customer: customerId,
    metadata: { admin_assigned: "true", admin_note: adminNote, assigned_tier: "level_4" },
  };

  let invoice: Stripe.Invoice;
  if (collectAuto) {
    invoice = await stripe.invoices.create({ ...base, collection_method: "charge_automatically" } as Stripe.InvoiceCreateParams);
  } else {
    invoice = await stripe.invoices.create({ ...base, collection_method: "send_invoice", days_until_due: 7 } as Stripe.InvoiceCreateParams);
  }

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  if (collectAuto) await stripe.invoices.pay(finalized.id);
}

async function createSubscription(
  stripe: Stripe,
  customerId: string,
  priceId: string,
  adminNote: string,
  collectAuto: boolean,
  cancelAtTs?: number
): Promise<Stripe.Subscription> {
  const meta = { admin_assigned: "true", admin_note: adminNote, assigned_tier: "level_4" };

  const sub = collectAuto
    ? await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId, quantity: 1 }],
        collection_method: "charge_automatically",
        metadata: meta,
      })
    : await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId, quantity: 1 }],
        collection_method: "send_invoice",
        days_until_due: 7,
        metadata: meta,
      });

  if (cancelAtTs) {
    await stripe.subscriptions.update(sub.id, { cancel_at: cancelAtTs });
  }

  return sub;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main action
// ─────────────────────────────────────────────────────────────────────────────

export async function assignL4Subscription(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const memberId = (formData.get("memberId") as string)?.trim();
  const packageType = (formData.get("packageType") as PackageType) ?? "pay_in_full";
  const adminNote = ((formData.get("adminNote") as string) ?? "").trim();
  const collectAuto = formData.get("collectionMethod") !== "invoice";

  if (!memberId) return { error: "Member ID is required." };

  const supabase = await createClient();
  const { data: member, error: memberErr } = await supabase
    .from("member")
    .select("id, email, stripe_customer_id")
    .eq("id", memberId)
    .single();

  if (memberErr || !member) return { error: "Member not found." };
  if (!member.stripe_customer_id) {
    return { error: "Member has no Stripe customer ID. They must complete at least one checkout first." };
  }

  const stripe = getStripe();
  const cid = member.stripe_customer_id;

  try {
    // ── Pay in Full ──────────────────────────────────────────────────────────
    if (packageType === "pay_in_full") {
      const raw = (formData.get("customAmount") as string)?.trim();
      const cents = raw ? Math.round(parseFloat(raw) * 100) : 450000;
      if (isNaN(cents) || cents < 100) return { error: "Invalid amount." };
      await createInvoice(stripe, cid, cents, "Positives Executive Coaching (Pay in Full)", adminNote, collectAuto);
    }

    // ── 3-Pay Plan ───────────────────────────────────────────────────────────
    else if (packageType === "three_pay") {
      const priceId = config.stripe.prices.level4ThreePay;
      if (!priceId) return { error: "STRIPE_PRICE_LEVEL_4_THREE_PAY is not configured." };
      await createSubscription(stripe, cid, priceId, adminNote, collectAuto, cancelAtFromSeconds(90 * 24 * 3600));
    }

    // ── Saved Stripe Price ───────────────────────────────────────────────────
    else if (packageType === "saved_price") {
      const priceId = (formData.get("savedPriceId") as string)?.trim();
      if (!priceId) return { error: "No price selected." };

      // Fetch price to check for stored cycle count in metadata
      const price = await stripe.prices.retrieve(priceId);
      const cycles = price.metadata?.cycles ? parseInt(price.metadata.cycles, 10) : null;
      const interval = price.recurring?.interval ?? "month";
      const intervalCount = price.recurring?.interval_count ?? 1;
      const billingKey = intervalCount === 3 ? "quarterly" : interval === "year" ? "annual" : "monthly";
      const cancelAt = cycles ? cancelAtFromSeconds(cycles * (INTERVAL_SECONDS[billingKey] ?? INTERVAL_SECONDS.monthly)) : undefined;

      await createSubscription(stripe, cid, priceId, adminNote, collectAuto, cancelAt);
    }

    // ── Custom — create a new Stripe Price, then subscribe ──────────────────
    else if (packageType === "custom") {
      const amountStr = (formData.get("customAmount") as string)?.trim();
      const billingType = (formData.get("billingType") as string) ?? "monthly";
      const cyclesStr = (formData.get("cycles") as string)?.trim();
      const nickname = (formData.get("nickname") as string)?.trim() || `Custom Executive Coaching — ${billingType}`;
      const l4ProductId = config.stripe.products.level4;

      if (!l4ProductId) return { error: "STRIPE_PRODUCT_LEVEL_4 is not configured." };
      const cents = Math.round(parseFloat(amountStr) * 100);
      if (isNaN(cents) || cents < 100) return { error: "Enter a valid amount (minimum $1.00)." };

      const cycles = cyclesStr ? parseInt(cyclesStr, 10) : null;

      if (billingType === "one_time") {
        const desc = (formData.get("customDescription") as string)?.trim() || nickname;
        await createInvoice(stripe, cid, cents, desc, adminNote, collectAuto);
      } else {
        const intervalMap: Record<string, Stripe.PriceCreateParams.Recurring.Interval> = {
          monthly:   "month",
          quarterly: "month",
          annual:    "year",
        };
        const intervalCountMap: Record<string, number> = {
          monthly:   1,
          quarterly: 3,
          annual:    1,
        };

        // Create a named Stripe Price — this becomes the reusable preset
        const newPrice = await stripe.prices.create({
          product: l4ProductId,
          unit_amount: cents,
          currency: "usd",
          nickname,
          recurring: {
            interval: intervalMap[billingType] ?? "month",
            interval_count: intervalCountMap[billingType] ?? 1,
          },
          metadata: { ...(cycles ? { cycles: String(cycles) } : {}) },
        });

        const billingKey = billingType as keyof typeof INTERVAL_SECONDS;
        const cancelAt = cycles ? cancelAtFromSeconds(cycles * (INTERVAL_SECONDS[billingKey] ?? INTERVAL_SECONDS.monthly)) : undefined;

        await createSubscription(stripe, cid, newPrice.id, adminNote, collectAuto, cancelAt);
      }
    } else {
      return { error: "Unknown package type." };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown Stripe error";
    console.error("[admin/assign-l4]", msg);
    return { error: `Stripe error: ${msg}` };
  }

  await setMemberTierL4(memberId);
  redirect(`/admin/members/${memberId}?l4_assigned=1`);
}
