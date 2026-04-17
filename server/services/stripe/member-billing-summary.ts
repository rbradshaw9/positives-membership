import type Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { getStripe } from "@/lib/stripe/config";
import type { MemberBillingSummary } from "@/lib/admin/member-crm-insights";

type SummaryPatch = Partial<Omit<MemberBillingSummary, "member_id" | "created_at">>;

type CoursePurchaseRow = {
  purchased_at: string | null;
  stripe_payment_intent_id: string | null;
  course: { price_cents: number | null } | null;
};

function normalizeCurrency(currency?: string | null) {
  return (currency ?? "usd").toLowerCase();
}

function getSubscriptionSnapshot(subscription: Stripe.Subscription | null) {
  if (!subscription) {
    return {
      active_subscription_price_id: null,
      active_subscription_amount_cents: null,
      active_subscription_interval: null,
    };
  }

  const item = subscription.items.data[0];
  return {
    active_subscription_price_id: item?.price?.id ?? null,
    active_subscription_amount_cents: item?.price?.unit_amount ?? null,
    active_subscription_interval: item?.price?.recurring?.interval ?? null,
  };
}

async function getMemberBillingSummaryRow(memberId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member_billing_summary")
    .select<MemberBillingSummary>("*")
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) {
    console.error("[stripe/member-billing-summary] summary lookup failed:", error.message);
    return null;
  }

  return (data as MemberBillingSummary | null) ?? null;
}

async function findMemberByCustomerId(customerId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member")
    .select<{ id: string }>("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("[stripe/member-billing-summary] member lookup failed:", error.message);
    return null;
  }

  return data?.id ?? null;
}

async function upsertMemberBillingSummary(memberId: string, patch: SummaryPatch) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const current = await getMemberBillingSummaryRow(memberId);

  const base = current ?? {
    member_id: memberId,
    stripe_customer_id: null,
    currency: "usd",
    first_paid_at: null,
    last_paid_at: null,
    lifetime_value_cents: 0,
    subscription_lifetime_value_cents: 0,
    course_lifetime_value_cents: 0,
    successful_payment_count: 0,
    failed_payment_count: 0,
    refund_total_cents: 0,
    chargeback_count: 0,
    active_subscription_price_id: null,
    active_subscription_amount_cents: null,
    active_subscription_interval: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies MemberBillingSummary;

  const payload = {
    ...base,
    ...patch,
    member_id: memberId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("member_billing_summary")
    .upsert(payload, { onConflict: "member_id" });

  if (error) {
    console.error("[stripe/member-billing-summary] summary upsert failed:", error.message);
  }

  return payload;
}

export async function syncSubscriptionSnapshotFromStripe(params: {
  customerId: string;
  subscription: Stripe.Subscription;
}) {
  const memberId = await findMemberByCustomerId(params.customerId);
  if (!memberId) return null;

  const isActiveState = ["active", "trialing", "past_due"].includes(params.subscription.status);
  const snapshot = isActiveState ? getSubscriptionSnapshot(params.subscription) : getSubscriptionSnapshot(null);

  return upsertMemberBillingSummary(memberId, {
    stripe_customer_id: params.customerId,
    ...snapshot,
  });
}

export async function recordInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
  if (!customerId) return null;

  const memberId = await findMemberByCustomerId(customerId);
  if (!memberId) return null;

  const current = await getMemberBillingSummaryRow(memberId);
  const amountPaid = invoice.amount_paid ?? 0;
  const paidAt = invoice.status_transitions.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : new Date().toISOString();

  const nextFirstPaidAt =
    !current?.first_paid_at || new Date(paidAt) < new Date(current.first_paid_at) ? paidAt : current.first_paid_at;
  const nextLastPaidAt =
    !current?.last_paid_at || new Date(paidAt) > new Date(current.last_paid_at) ? paidAt : current.last_paid_at;

  return upsertMemberBillingSummary(memberId, {
    stripe_customer_id: customerId,
    currency: normalizeCurrency(invoice.currency),
    first_paid_at: nextFirstPaidAt,
    last_paid_at: nextLastPaidAt,
    lifetime_value_cents: (current?.lifetime_value_cents ?? 0) + amountPaid,
    subscription_lifetime_value_cents:
      (current?.subscription_lifetime_value_cents ?? 0) + amountPaid,
    successful_payment_count: (current?.successful_payment_count ?? 0) + 1,
  });
}

export async function recordInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
  if (!customerId) return null;

  const memberId = await findMemberByCustomerId(customerId);
  if (!memberId) return null;

  const current = await getMemberBillingSummaryRow(memberId);
  return upsertMemberBillingSummary(memberId, {
    stripe_customer_id: customerId,
    currency: normalizeCurrency(invoice.currency),
    failed_payment_count: (current?.failed_payment_count ?? 0) + 1,
  });
}

export async function recordCoursePaymentSucceeded(params: {
  memberId: string;
  stripeCustomerId: string | null;
  amountPaidCents: number;
  occurredAt?: string | null;
  currency?: string | null;
}) {
  const current = await getMemberBillingSummaryRow(params.memberId);
  const paidAt = params.occurredAt ?? new Date().toISOString();
  const nextFirstPaidAt =
    !current?.first_paid_at || new Date(paidAt) < new Date(current.first_paid_at) ? paidAt : current.first_paid_at;
  const nextLastPaidAt =
    !current?.last_paid_at || new Date(paidAt) > new Date(current.last_paid_at) ? paidAt : current.last_paid_at;

  return upsertMemberBillingSummary(params.memberId, {
    stripe_customer_id: params.stripeCustomerId ?? current?.stripe_customer_id ?? null,
    currency: normalizeCurrency(params.currency),
    first_paid_at: nextFirstPaidAt,
    last_paid_at: nextLastPaidAt,
    lifetime_value_cents: (current?.lifetime_value_cents ?? 0) + params.amountPaidCents,
    course_lifetime_value_cents: (current?.course_lifetime_value_cents ?? 0) + params.amountPaidCents,
    successful_payment_count: (current?.successful_payment_count ?? 0) + 1,
  });
}

export async function recordChargeRefund(params: {
  customerId: string | null;
  memberId?: string | null;
  amountRefundedCents: number;
}) {
  const memberId = params.memberId ?? (params.customerId ? await findMemberByCustomerId(params.customerId) : null);
  if (!memberId) return null;

  const current = await getMemberBillingSummaryRow(memberId);
  return upsertMemberBillingSummary(memberId, {
    stripe_customer_id: params.customerId ?? current?.stripe_customer_id ?? null,
    refund_total_cents: (current?.refund_total_cents ?? 0) + params.amountRefundedCents,
  });
}

export async function recordChargeback(params: {
  customerId: string | null;
  memberId?: string | null;
}) {
  const memberId = params.memberId ?? (params.customerId ? await findMemberByCustomerId(params.customerId) : null);
  if (!memberId) return null;

  const current = await getMemberBillingSummaryRow(memberId);
  return upsertMemberBillingSummary(memberId, {
    stripe_customer_id: params.customerId ?? current?.stripe_customer_id ?? null,
    chargeback_count: (current?.chargeback_count ?? 0) + 1,
  });
}

async function listAllPaidInvoices(customerId: string) {
  const stripe = getStripe();
  const invoices: Stripe.Invoice[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const response = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    invoices.push(...response.data);
    if (!response.has_more || response.data.length === 0) break;
    startingAfter = response.data[response.data.length - 1]?.id;
  }

  return invoices;
}

async function listAllSucceededCoursePaymentIntents(customerId: string) {
  const stripe = getStripe();
  const intents: Stripe.PaymentIntent[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const response = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    intents.push(...response.data);
    if (!response.has_more || response.data.length === 0) break;
    startingAfter = response.data[response.data.length - 1]?.id;
  }

  return intents.filter(
    (intent) => intent.status === "succeeded" && intent.metadata?.purchase_type === "course"
  );
}

export async function backfillMemberBillingSummary(params: {
  memberId: string;
  stripeCustomerId: string | null;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const stripe = getStripe();

  const { data: coursePurchases, error: entitlementError } = await supabase
    .from("course_entitlement")
    .select<CoursePurchaseRow[]>("purchased_at, stripe_payment_intent_id, course:course_id(price_cents)")
    .eq("member_id", params.memberId)
    .eq("source", "purchase");

  if (entitlementError) {
    console.error("[stripe/member-billing-summary] entitlement backfill query failed:", entitlementError.message);
  }

  const courseLifetimeValueFromEntitlements = (coursePurchases ?? []).reduce(
    (sum, row) => sum + (row.course?.price_cents ?? 0),
    0
  );
  const entitlementPaymentIntentIds = new Set(
    (coursePurchases ?? [])
      .map((row) => row.stripe_payment_intent_id)
      .filter((value): value is string => Boolean(value))
  );
  let extraCourseLifetimeValue = 0;
  let extraCoursePurchaseCount = 0;
  let extraCoursePurchaseDates: string[] = [];

  let subscriptionLifetimeValue = 0;
  let successfulInvoiceCount = 0;
  let failedInvoiceCount = 0;
  let refundTotal = 0;
  let firstPaidAt: string | null = null;
  let lastPaidAt: string | null = null;
  let currency = "usd";
  let activeSubscription: Stripe.Subscription | null = null;

  if (params.stripeCustomerId) {
    const invoices = await listAllPaidInvoices(params.stripeCustomerId);
    const coursePaymentIntents = await listAllSucceededCoursePaymentIntents(params.stripeCustomerId);
    const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
    const failedInvoices = invoices.filter(
      (invoice) => invoice.status === "uncollectible" || (invoice.status === "open" && (invoice.attempt_count ?? 0) > 0)
    );

    subscriptionLifetimeValue = paidInvoices.reduce((sum, invoice) => sum + (invoice.amount_paid ?? 0), 0);
    successfulInvoiceCount = paidInvoices.length;
    failedInvoiceCount = failedInvoices.length;
    refundTotal = invoices.reduce((sum, invoice) => sum + (invoice.amount_overpaid ?? 0), 0);

    const paidDates = paidInvoices
      .map((invoice) =>
        invoice.status_transitions.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : null
      )
      .filter(Boolean) as string[];

    firstPaidAt = paidDates.length > 0 ? paidDates.slice().sort()[0] ?? null : null;
    lastPaidAt = paidDates.length > 0 ? paidDates.slice().sort().at(-1) ?? null : null;
    currency = normalizeCurrency(paidInvoices[0]?.currency);

    const extraCoursePaymentIntents = coursePaymentIntents.filter(
      (intent) => !entitlementPaymentIntentIds.has(intent.id)
    );
    extraCourseLifetimeValue = extraCoursePaymentIntents.reduce(
      (sum, intent) => sum + (intent.amount_received || intent.amount || 0),
      0
    );
    extraCoursePurchaseCount = extraCoursePaymentIntents.length;
    extraCoursePurchaseDates = extraCoursePaymentIntents.map((intent) =>
      new Date(intent.created * 1000).toISOString()
    );

    const subscriptions = await stripe.subscriptions.list({
      customer: params.stripeCustomerId,
      status: "all",
      limit: 10,
    });

    activeSubscription =
      subscriptions.data.find((subscription) =>
        ["active", "trialing", "past_due"].includes(subscription.status)
      ) ?? subscriptions.data[0] ?? null;
  }

  const courseLifetimeValue = courseLifetimeValueFromEntitlements + extraCourseLifetimeValue;
  const coursePurchaseCount = (coursePurchases ?? []).length + extraCoursePurchaseCount;
  const coursePurchaseDates = [
    ...((coursePurchases ?? []).map((row) => row.purchased_at).filter(Boolean) as string[]),
    ...extraCoursePurchaseDates,
  ].sort();

  return upsertMemberBillingSummary(params.memberId, {
    stripe_customer_id: params.stripeCustomerId,
    currency,
    first_paid_at: firstPaidAt ?? coursePurchaseDates[0] ?? null,
    last_paid_at: lastPaidAt ?? coursePurchaseDates.at(-1) ?? null,
    lifetime_value_cents: subscriptionLifetimeValue + courseLifetimeValue,
    subscription_lifetime_value_cents: subscriptionLifetimeValue,
    course_lifetime_value_cents: courseLifetimeValue,
    successful_payment_count: successfulInvoiceCount + coursePurchaseCount,
    failed_payment_count: failedInvoiceCount,
    refund_total_cents: refundTotal,
    ...getSubscriptionSnapshot(activeSubscription),
  });
}
