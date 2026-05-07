import type Stripe from "stripe";
import { config } from "@/lib/config";
import { metricCount } from "@/lib/observability/metrics";
import { getStripe } from "@/lib/stripe/config";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

type EventTicketOrderStatus = "pending" | "paid" | "refunded" | "chargeback" | "canceled" | "comp" | "expired";
type EventTicketInactiveStatus = "refunded" | "chargeback" | "canceled";

type EventTicketOrderRow = {
  id: string;
  member_id: string;
  event_id: string;
  status: EventTicketOrderStatus;
  currency: string;
  total_cents: number;
  quantity: number;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
};

type EventTicketOrderItemRow = {
  id: string;
  ticket_type_name: string;
  quantity: number;
  unit_amount_cents: number;
  total_amount_cents: number;
  currency: string;
};

type EventTicketMemberRow = {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
};

type EventTicketEventRow = {
  id: string;
  title: string;
};

function idFromExpandable<T extends { id: string }>(value: string | T | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function assertAppUrl(appUrl: string) {
  try {
    const parsed = new URL(appUrl);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("invalid protocol");
  } catch {
    throw new Error(`[Stripe] NEXT_PUBLIC_APP_URL is not a valid absolute URL: "${appUrl}".`);
  }
}

async function getSavedPaymentMethodId(stripe: ReturnType<typeof getStripe>, customerId: string) {
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });
  if (customer.deleted) return null;

  const defaultPaymentMethod = customer.invoice_settings.default_payment_method;
  if (typeof defaultPaymentMethod === "string") return defaultPaymentMethod;
  if (defaultPaymentMethod?.id) return defaultPaymentMethod.id;

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 1,
  });

  return paymentMethods.data[0]?.id ?? null;
}

async function getOrderBundle(orderId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: order, error: orderError } = await supabase
    .from("event_ticket_order")
    .select<EventTicketOrderRow>(
      "id, member_id, event_id, status, currency, total_cents, quantity, stripe_customer_id, stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    throw new Error(`[Stripe] Event ticket order ${orderId} was not found: ${orderError?.message ?? "missing row"}`);
  }

  const [itemsResult, memberResult, eventResult] = await Promise.all([
    supabase
      .from("event_ticket_order_item")
      .select<EventTicketOrderItemRow>("id, ticket_type_name, quantity, unit_amount_cents, total_amount_cents, currency")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("member")
      .select<EventTicketMemberRow>("id, email, stripe_customer_id")
      .eq("id", order.member_id)
      .maybeSingle(),
    supabase
      .from("member_event")
      .select<EventTicketEventRow>("id, title")
      .eq("id", order.event_id)
      .maybeSingle(),
  ]);

  if (itemsResult.error) throw new Error(`[Stripe] Failed to fetch event ticket items: ${itemsResult.error.message}`);
  if (memberResult.error || !memberResult.data) {
    throw new Error(`[Stripe] Event ticket order ${orderId} has no member: ${memberResult.error?.message ?? "missing row"}`);
  }
  if (eventResult.error || !eventResult.data) {
    throw new Error(`[Stripe] Event ticket order ${orderId} has no event: ${eventResult.error?.message ?? "missing row"}`);
  }

  return {
    order: order as unknown as EventTicketOrderRow,
    items: (itemsResult.data ?? []) as unknown as EventTicketOrderItemRow[],
    member: memberResult.data as unknown as EventTicketMemberRow,
    event: eventResult.data as unknown as EventTicketEventRow,
  };
}

export async function markEventTicketOrderPaid({
  orderId,
  stripeCustomerId = null,
  stripeCheckoutSessionId = null,
  stripePaymentIntentId = null,
  stripeChargeId = null,
  paidAt = null,
}: {
  orderId: string;
  stripeCustomerId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  paidAt?: string | null;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { order } = await getOrderBundle(orderId);
  const wasAlreadyPaid = order.status === "paid";

  const { error: updateError } = await supabase
    .from("event_ticket_order")
    .update({
      status: "paid",
      stripe_customer_id: stripeCustomerId ?? order.stripe_customer_id,
      stripe_checkout_session_id: stripeCheckoutSessionId ?? order.stripe_checkout_session_id,
      stripe_payment_intent_id: stripePaymentIntentId ?? order.stripe_payment_intent_id,
      stripe_charge_id: stripeChargeId ?? order.stripe_charge_id,
      paid_at: paidAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) throw new Error(`[Stripe] Failed to mark event ticket order paid: ${updateError.message}`);

  const { error: ticketError } = await supabase
    .from("event_ticket")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .in("status", ["pending", "active"]);

  if (ticketError) throw new Error(`[Stripe] Failed to activate event tickets: ${ticketError.message}`);

  if (stripeCustomerId) {
    await supabase
      .from("member")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", order.member_id)
      .is("stripe_customer_id", null);
  }

  if (!wasAlreadyPaid) {
    await supabase.from("activity_event").insert({
      member_id: order.member_id,
      event_type: "event_ticket_purchased",
      metadata: {
        event_id: order.event_id,
        order_id: order.id,
        quantity: order.quantity,
        total_cents: order.total_cents,
        stripe_checkout_session_id: stripeCheckoutSessionId,
        stripe_payment_intent_id: stripePaymentIntentId,
        stripe_charge_id: stripeChargeId,
      },
    });
  }

  metricCount("event_ticket.order_paid", 1, {
    outcome: wasAlreadyPaid ? "idempotent" : "paid",
    has_checkout_session: Boolean(stripeCheckoutSessionId),
    has_payment_intent: Boolean(stripePaymentIntentId),
  });
}

async function markEventTicketOrderInactive({
  status,
  paymentIntentId,
  chargeId,
  note,
}: {
  status: EventTicketInactiveStatus;
  paymentIntentId: string | null;
  chargeId: string | null;
  note: string;
}) {
  const identifiers = [
    paymentIntentId ? `stripe_payment_intent_id.eq.${paymentIntentId}` : null,
    chargeId ? `stripe_charge_id.eq.${chargeId}` : null,
  ].filter(Boolean);

  if (identifiers.length === 0) {
    metricCount("event_ticket.status_change", 1, { outcome: "missing_identifier", status });
    return;
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: orders, error } = await supabase
    .from("event_ticket_order")
    .update({
      status,
      refunded_at: status === "refunded" ? new Date().toISOString() : undefined,
      grant_note: note,
      ...(chargeId ? { stripe_charge_id: chargeId } : {}),
      updated_at: new Date().toISOString(),
    })
    .in("status", ["paid", "pending"])
    .or(identifiers.join(","))
    .select<Array<{ id: string; member_id: string; event_id: string }>>("id, member_id, event_id");

  if (error) throw new Error(`[Stripe] Failed to mark event ticket order ${status}: ${error.message}`);
  if (!orders || orders.length === 0) {
    metricCount("event_ticket.status_change", 1, { outcome: "no_match", status });
    return;
  }

  const orderIds = orders.map((order) => order.id);
  const { error: ticketError } = await supabase
    .from("event_ticket")
    .update({ status, updated_at: new Date().toISOString() })
    .in("order_id", orderIds)
    .in("status", ["pending", "active"]);

  if (ticketError) throw new Error(`[Stripe] Failed to mark event tickets ${status}: ${ticketError.message}`);

  await supabase.from("activity_event").insert(
    orders.map((order) => ({
      member_id: order.member_id,
      event_type: "event_ticket_status_changed",
      metadata: {
        event_id: order.event_id,
        order_id: order.id,
        source: "stripe",
        status,
        payment_intent_id: paymentIntentId,
        charge_id: chargeId,
      },
    }))
  );

  metricCount("event_ticket.status_change", orders.length, { outcome: "updated", status });
}

export async function createEventTicketPaymentOrCheckout(orderId: string) {
  const stripe = getStripe();
  const appUrl = config.app.url;
  assertAppUrl(appUrl);

  const { order, items, member, event } = await getOrderBundle(orderId);
  if (order.status !== "pending") {
    return {
      status: "error" as const,
      url: `/events/${order.event_id}`,
      message: "This ticket order is no longer pending.",
    };
  }

  if (order.total_cents <= 0) {
    await markEventTicketOrderPaid({
      orderId,
      stripeCustomerId: member.stripe_customer_id,
      paidAt: new Date().toISOString(),
    });
    return {
      status: "purchased" as const,
      url: `/events/${order.event_id}?ticket=success`,
      message: "Your event ticket is confirmed.",
    };
  }

  if (member.stripe_customer_id && member.email) {
    const paymentMethodId = await getSavedPaymentMethodId(stripe, member.stripe_customer_id);

    if (paymentMethodId) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: order.total_cents,
          currency: order.currency,
          customer: member.stripe_customer_id,
          payment_method: paymentMethodId,
          confirm: true,
          off_session: true,
          description: `Positives event: ${event.title}`,
          metadata: {
            purchase_type: "event_ticket",
            event_id: order.event_id,
            order_id: order.id,
            member_id: member.id,
            buyer_email: member.email,
          },
          expand: ["latest_charge"],
        });

        if (paymentIntent.status === "succeeded") {
          await markEventTicketOrderPaid({
            orderId,
            stripeCustomerId: member.stripe_customer_id,
            stripePaymentIntentId: paymentIntent.id,
            stripeChargeId: idFromExpandable(paymentIntent.latest_charge),
            paidAt: new Date(paymentIntent.created * 1000).toISOString(),
          });
          return {
            status: "purchased" as const,
            url: `/events/${order.event_id}?ticket=success`,
            message: "Your event ticket is confirmed.",
          };
        }
      } catch (error) {
        console.warn(
          "[event tickets] saved-card purchase fell back to Checkout:",
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: item.currency,
        unit_amount: item.unit_amount_cents,
        product_data: {
          name: item.ticket_type_name,
          description: event.title,
        },
      },
    })),
    customer: member.stripe_customer_id ?? undefined,
    customer_email: !member.stripe_customer_id && member.email ? member.email : undefined,
    customer_creation: member.stripe_customer_id ? undefined : "always",
    client_reference_id: member.id,
    metadata: {
      purchase_type: "event_ticket",
      event_id: order.event_id,
      order_id: order.id,
      member_id: member.id,
      ...(member.email ? { buyer_email: member.email } : {}),
    },
    success_url: `${appUrl}/events/${order.event_id}?ticket=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/events/${order.event_id}?ticket=canceled`,
    allow_promotion_codes: true,
    locale: "auto",
    branding_settings: {
      background_color: "#FAFAFA",
      border_style: "rounded",
      button_color: "#2EC4B6",
      display_name: "Positives",
      font_family: "montserrat",
      icon: {
        type: "url",
        url: `${appUrl}/logos/png/positives-logos_positives-icon-square.png`,
      },
      logo: {
        type: "url",
        url: `${appUrl}/logos/png/positives-logos_Positives-logo-full.png`,
      },
    },
    custom_text: {
      submit: {
        message: "Event tickets are connected to your Positives membership.",
      },
    },
  });

  if (!session.url) throw new Error("[Stripe] Event ticket checkout session was created but has no URL.");

  const { error } = await asLooseSupabaseClient(getAdminClient())
    .from("event_ticket_order")
    .update({
      stripe_customer_id: member.stripe_customer_id,
      stripe_checkout_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  if (error) throw new Error(`[Stripe] Failed to link event ticket checkout session: ${error.message}`);

  return {
    status: "checkout" as const,
    url: session.url,
    message: "Continue to Stripe Checkout to finish your ticket purchase.",
  };
}

export async function handleEventTicketCheckout(session: Stripe.Checkout.Session, customerId: string) {
  if (session.metadata?.purchase_type !== "event_ticket") return;
  const orderId = session.metadata.order_id;
  if (!orderId) {
    metricCount("event_ticket.checkout", 1, { outcome: "missing_order" });
    return;
  }

  await markEventTicketOrderPaid({
    orderId,
    stripeCustomerId: customerId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: idFromExpandable(session.payment_intent),
    paidAt: new Date().toISOString(),
  });
}

export async function handleEventTicketPaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  if (paymentIntent.metadata?.purchase_type !== "event_ticket") return;
  const orderId = paymentIntent.metadata.order_id;
  if (!orderId) {
    metricCount("event_ticket.payment_intent", 1, { outcome: "missing_order" });
    return;
  }

  await markEventTicketOrderPaid({
    orderId,
    stripeCustomerId: idFromExpandable(paymentIntent.customer),
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId: idFromExpandable(paymentIntent.latest_charge),
    paidAt: new Date(paymentIntent.created * 1000).toISOString(),
  });
}

export async function handleEventTicketChargeRefunded(charge: Stripe.Charge) {
  const refundAmount = charge.amount_refunded ?? 0;
  const capturedAmount = charge.amount_captured || charge.amount || 0;
  if (refundAmount <= 0 || refundAmount < capturedAmount) return;

  await markEventTicketOrderInactive({
    status: "refunded",
    paymentIntentId: idFromExpandable(charge.payment_intent),
    chargeId: charge.id,
    note: `Refunded through Stripe charge ${charge.id}.`,
  });
}

export async function handleEventTicketDisputeClosed(dispute: Stripe.Dispute) {
  if (dispute.status !== "lost") return;

  await markEventTicketOrderInactive({
    status: "chargeback",
    paymentIntentId: idFromExpandable(dispute.payment_intent),
    chargeId: idFromExpandable(dispute.charge),
    note: `Chargeback lost through Stripe dispute ${dispute.id}.`,
  });
}
