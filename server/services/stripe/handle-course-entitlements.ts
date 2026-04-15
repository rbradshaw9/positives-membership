import type Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

type CourseEntitlementStatus = "refunded" | "chargeback";

type CourseEntitlementRow = {
  id: string;
  member_id: string;
  course_id: string;
};

function idFromExpandable<T extends { id: string }>(value: string | T | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function markCourseEntitlementInactive({
  status,
  paymentIntentId,
  chargeId,
  note,
}: {
  status: CourseEntitlementStatus;
  paymentIntentId: string | null;
  chargeId: string | null;
  note: string;
}) {
  const identifiers = [
    paymentIntentId ? `stripe_payment_intent_id.eq.${paymentIntentId}` : null,
    chargeId ? `stripe_charge_id.eq.${chargeId}` : null,
  ].filter(Boolean);

  if (identifiers.length === 0) {
    console.warn(`[Stripe] Course entitlement ${status} event had no payment identifier.`);
    return;
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("course_entitlement")
    .update({
      status,
      revoked_at: new Date().toISOString(),
      revoke_note: note,
      ...(chargeId ? { stripe_charge_id: chargeId } : {}),
    })
    .eq("status", "active")
    .or(identifiers.join(","))
    .select<CourseEntitlementRow[]>("id, member_id, course_id");

  if (error) {
    throw new Error(`[Stripe] Failed to mark course entitlement ${status}: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.log(
      `[Stripe] No active course entitlement matched ${status} identifiers ` +
        `(payment_intent=${paymentIntentId ?? "none"}, charge=${chargeId ?? "none"}).`
    );
    return;
  }

  await supabase.from("activity_event").insert(
    data.map((entitlement) => ({
      member_id: entitlement.member_id,
      event_type: "admin_course_revoked",
      metadata: {
        course_id: entitlement.course_id,
        entitlement_id: entitlement.id,
        source: "stripe",
        status,
        payment_intent_id: paymentIntentId,
        charge_id: chargeId,
      },
    }))
  );

  console.log(`[Stripe] Marked ${data.length} course entitlement(s) ${status}.`);
}

export async function handleChargeRefunded(charge: Stripe.Charge) {
  const refundAmount = charge.amount_refunded ?? 0;
  const capturedAmount = charge.amount_captured || charge.amount || 0;

  if (refundAmount <= 0 || refundAmount < capturedAmount) {
    console.log(
      `[Stripe] Ignoring partial/no refund for charge ${charge.id} ` +
        `(${refundAmount}/${capturedAmount}).`
    );
    return;
  }

  await markCourseEntitlementInactive({
    status: "refunded",
    paymentIntentId: idFromExpandable(charge.payment_intent),
    chargeId: charge.id,
    note: `Refunded through Stripe charge ${charge.id}.`,
  });
}

export async function handleDisputeClosed(dispute: Stripe.Dispute) {
  if (dispute.status !== "lost") {
    console.log(`[Stripe] Dispute ${dispute.id} closed with status ${dispute.status}; no course access change.`);
    return;
  }

  await markCourseEntitlementInactive({
    status: "chargeback",
    paymentIntentId: idFromExpandable(dispute.payment_intent),
    chargeId: idFromExpandable(dispute.charge),
    note: `Chargeback lost through Stripe dispute ${dispute.id}.`,
  });
}
