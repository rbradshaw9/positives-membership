import type Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { recordChargeRefund, recordCoursePaymentSucceeded } from "./member-billing-summary";

type CourseEntitlementStatus = "refunded" | "chargeback";

type CourseEntitlementRow = {
  id: string;
  member_id: string;
  course_id: string;
};

type CoursePurchaseGrantInput = {
  memberId: string;
  courseId: string;
  stripeCustomerId: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  grantNote: string;
};

type CoursePurchaseGrantResult = {
  granted: boolean;
  entitlementId: string | null;
  memberId: string;
  courseId: string;
};

function idFromExpandable<T extends { id: string }>(value: string | T | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function grantPurchasedCourseEntitlement({
  memberId,
  courseId,
  stripeCustomerId,
  stripeCheckoutSessionId = null,
  stripePaymentIntentId = null,
  stripeChargeId = null,
  grantNote,
}: CoursePurchaseGrantInput): Promise<CoursePurchaseGrantResult> {
  const supabase = asLooseSupabaseClient(getAdminClient());

  const { data: course, error: courseError } = await supabase
    .from("course")
    .select<{ id: string; title: string; status: string }>("id, title, status")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError || !course) {
    throw new Error(
      `[Stripe] Course purchase references missing course ${courseId}: ` +
        `${courseError?.message ?? "not found"}`
    );
  }

  const { data: existingEntitlement, error: existingError } = await supabase
    .from("course_entitlement")
    .select<{ id: string }>("id")
    .eq("member_id", memberId)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `[Stripe] Failed to check existing course entitlement for ${memberId}: ${existingError.message}`
    );
  }

  if (existingEntitlement) {
    return {
      granted: false,
      entitlementId: existingEntitlement.id,
      memberId,
      courseId,
    };
  }

  const { data: entitlement, error: entitlementError } = await supabase
    .from("course_entitlement")
    .insert({
      member_id: memberId,
      course_id: courseId,
      source: "purchase",
      status: "active",
      stripe_customer_id: stripeCustomerId,
      stripe_checkout_session_id: stripeCheckoutSessionId,
      stripe_payment_intent_id: stripePaymentIntentId,
      stripe_charge_id: stripeChargeId,
      purchased_at: new Date().toISOString(),
      grant_note: grantNote,
    })
    .select<{ id: string }>("id")
    .single();

  if (entitlementError) {
    if (entitlementError.code === "23505") {
      return {
        granted: false,
        entitlementId: null,
        memberId,
        courseId,
      };
    }

    throw new Error(
      `[Stripe] Failed to grant course entitlement for ${memberId}: ${entitlementError.message}`
    );
  }

  await supabase.from("activity_event").insert({
    member_id: memberId,
    event_type: "course_unlocked",
    metadata: {
      course_id: courseId,
      course_title: course.title,
      source: "purchase",
      stripe_checkout_session_id: stripeCheckoutSessionId,
      stripe_payment_intent_id: stripePaymentIntentId,
      stripe_charge_id: stripeChargeId,
    },
  });

  return {
    granted: true,
    entitlementId: entitlement?.id ?? null,
    memberId,
    courseId,
  };
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

  await recordChargeRefund({
    customerId: idFromExpandable(charge.customer),
    amountRefundedCents: refundAmount,
  });
}

export async function handleCoursePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  if (paymentIntent.metadata?.purchase_type !== "course") return;

  const courseId = paymentIntent.metadata.course_id ?? paymentIntent.metadata.courseId ?? null;
  const memberId = paymentIntent.metadata.member_id ?? paymentIntent.metadata.userId ?? null;

  if (!courseId || !memberId) {
    console.error(
      `[Stripe] Course payment intent ${paymentIntent.id} missing course/member metadata.`
    );
    return;
  }

  const chargeId = idFromExpandable(paymentIntent.latest_charge);
  const customerId = idFromExpandable(paymentIntent.customer);

  const result = await grantPurchasedCourseEntitlement({
    memberId,
    courseId,
    stripeCustomerId: customerId,
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId: chargeId,
    grantNote: `Purchased through saved-card payment ${paymentIntent.id}.`,
  });

  await recordCoursePaymentSucceeded({
    memberId,
    stripeCustomerId: customerId,
    amountPaidCents: paymentIntent.amount_received || paymentIntent.amount || 0,
    occurredAt: new Date(paymentIntent.created * 1000).toISOString(),
    currency: paymentIntent.currency,
  });

  console.log(
    `[Stripe] Course payment intent processed — member: ${memberId}, course: ${courseId}, ` +
      `granted: ${result.granted ? "yes" : "already_active"}.`
  );
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
