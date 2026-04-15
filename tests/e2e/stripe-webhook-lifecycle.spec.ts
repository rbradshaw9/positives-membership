import Stripe from "stripe";
import { expect, test } from "@playwright/test";
import {
  createCourseEntitlementWebhookFixture,
  createStandaloneCourseFixture,
  deleteCourseFixture,
  getMemberBillingState,
  MEMBER_EMAIL,
  waitForMemberBillingState,
  waitForCourseEntitlementByPaymentIntent,
  waitForCourseEntitlementStatus,
} from "./helpers";

test.describe.configure({ mode: "serial" });

function buildEvent(type: string, object: Record<string, unknown>) {
  return {
    id: `evt_test_${type.replace(/\./g, "_")}`,
    object: "event",
    api_version: "2026-03-25.dahlia",
    created: Math.floor(Date.now() / 1000),
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
  };
}

test.describe("Stripe webhook lifecycle", () => {
  test("rejects requests without a Stripe signature", async ({ request }) => {
    const response = await request.post("/api/webhooks/stripe", {
      data: "{}",
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Missing stripe-signature header.",
    });
  });

  test("updates member billing state across subscription lifecycle events", async ({
    request,
  }) => {
    const member = await getMemberBillingState(MEMBER_EMAIL);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const level1Monthly = process.env.STRIPE_PRICE_LEVEL_1_MONTHLY;
    const level2Monthly = process.env.STRIPE_PRICE_LEVEL_2_MONTHLY;
    const level3Monthly = process.env.STRIPE_PRICE_LEVEL_3_MONTHLY;

    if (!member.stripe_customer_id) {
      throw new Error(`Member fixture ${MEMBER_EMAIL} is missing stripe_customer_id.`);
    }

    if (!webhookSecret || !level1Monthly || !level2Monthly || !level3Monthly) {
      throw new Error("Missing Stripe webhook env vars required for lifecycle verification.");
    }

    const stripe = new Stripe("sk_test_placeholder", {
      apiVersion: "2026-03-25.dahlia",
    });

    const restorePriceByTier = {
      level_1: level1Monthly,
      level_2: level2Monthly,
      level_3: level3Monthly,
    } as const;

    const restoreTier =
      member.subscription_tier === "level_1" ||
      member.subscription_tier === "level_2" ||
      member.subscription_tier === "level_3"
        ? member.subscription_tier
        : "level_1";
    const restoreStatus = member.subscription_status === "trialing" ? "trialing" : "active";
    const restorePrice = restorePriceByTier[restoreTier as keyof typeof restorePriceByTier];

    const postSignedEvent = async (type: string, object: Record<string, unknown>) => {
      const payload = JSON.stringify(buildEvent(type, object));
      const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: webhookSecret,
      });

      const response = await request.post("/api/webhooks/stripe", {
        data: payload,
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
      });

      expect(response.status(), `${type} should return 200`).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ received: true });
    };

    const subscriptionPayload = (status: string, priceId: string) => ({
      id: "sub_test_webhook_lifecycle",
      object: "subscription",
      customer: member.stripe_customer_id,
      status,
      cancel_at: null,
      ended_at: null,
      metadata: {},
      items: {
        object: "list",
        data: [{ id: "si_test", price: { id: priceId } }],
        has_more: false,
        url: "/v1/subscription_items?subscription=sub_test_webhook_lifecycle",
      },
    });

    try {
      await postSignedEvent(
        "customer.subscription.updated",
        subscriptionPayload("past_due", level1Monthly)
      );
      await waitForMemberBillingState(MEMBER_EMAIL, {
        subscription_status: "past_due",
        subscription_tier: "level_1",
      });

      await postSignedEvent("invoice.payment_failed", {
        id: "in_test_payment_failed",
        object: "invoice",
        customer: member.stripe_customer_id,
        created: Math.floor(Date.now() / 1000),
        amount_due: 3700,
        next_payment_attempt: Math.floor(Date.now() / 1000) + 86_400,
      });
      await waitForMemberBillingState(MEMBER_EMAIL, {
        subscription_status: "past_due",
        subscription_tier: "level_1",
      });

      await postSignedEvent(
        "customer.subscription.updated",
        subscriptionPayload("active", level2Monthly)
      );
      await waitForMemberBillingState(MEMBER_EMAIL, {
        subscription_status: "active",
        subscription_tier: "level_2",
      });

      await postSignedEvent("customer.subscription.deleted", {
        id: "sub_test_webhook_lifecycle",
        object: "subscription",
        customer: member.stripe_customer_id,
      });
      await waitForMemberBillingState(MEMBER_EMAIL, {
        subscription_status: "canceled",
        subscription_tier: null,
      });
    } finally {
      await postSignedEvent(
        "customer.subscription.created",
        subscriptionPayload(restoreStatus, restorePrice)
      );
      await waitForMemberBillingState(MEMBER_EMAIL, {
        subscription_status: restoreStatus,
        subscription_tier: restoreTier,
      });
    }
  });

  test("marks purchased course entitlements inactive after refund or lost dispute", async ({
    request,
  }) => {
    const member = await getMemberBillingState(MEMBER_EMAIL);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET required for course entitlement webhook verification.");
    }

    const stripe = new Stripe("sk_test_placeholder", {
      apiVersion: "2026-03-25.dahlia",
    });

    const postSignedEvent = async (type: string, object: Record<string, unknown>) => {
      const payload = JSON.stringify(buildEvent(type, object));
      const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: webhookSecret,
      });

      const response = await request.post("/api/webhooks/stripe", {
        data: payload,
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
      });

      expect(response.status(), `${type} should return 200`).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ received: true });
    };

    const refundedPaymentIntent = "pi_e2e_course_refund";
    const refundedCharge = "ch_e2e_course_refund";
    const chargebackPaymentIntent = "pi_e2e_course_chargeback";
    const chargebackCharge = "ch_e2e_course_chargeback";

    const refundFixture = await createCourseEntitlementWebhookFixture({
      memberId: member.id,
      paymentIntentId: refundedPaymentIntent,
      chargeId: refundedCharge,
    });
    const chargebackFixture = await createCourseEntitlementWebhookFixture({
      memberId: member.id,
      paymentIntentId: chargebackPaymentIntent,
      chargeId: chargebackCharge,
    });

    try {
      await postSignedEvent("charge.refunded", {
        id: refundedCharge,
        object: "charge",
        amount: 5000,
        amount_captured: 5000,
        amount_refunded: 5000,
        payment_intent: refundedPaymentIntent,
      });
      await waitForCourseEntitlementStatus(refundFixture.entitlementId, "refunded");

      await postSignedEvent("charge.dispute.closed", {
        id: "dp_e2e_course_chargeback",
        object: "dispute",
        amount: 5000,
        charge: chargebackCharge,
        payment_intent: chargebackPaymentIntent,
        status: "lost",
      });
      await waitForCourseEntitlementStatus(chargebackFixture.entitlementId, "chargeback");
    } finally {
      await deleteCourseFixture(refundFixture.courseId);
      await deleteCourseFixture(chargebackFixture.courseId);
    }
  });

  test("grants course entitlement from direct saved-card payment intent", async ({
    request,
  }) => {
    const member = await getMemberBillingState(MEMBER_EMAIL);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET required for course payment verification.");
    }

    const stripe = new Stripe("sk_test_placeholder", {
      apiVersion: "2026-03-25.dahlia",
    });
    const paymentIntentId = "pi_e2e_course_direct_purchase";
    const chargeId = "ch_e2e_course_direct_purchase";
    const fixture = await createStandaloneCourseFixture("direct-purchase");

    const payload = JSON.stringify(
      buildEvent("payment_intent.succeeded", {
        id: paymentIntentId,
        object: "payment_intent",
        amount: 5000,
        amount_received: 5000,
        currency: "usd",
        customer: member.stripe_customer_id,
        latest_charge: chargeId,
        status: "succeeded",
        metadata: {
          purchase_type: "course",
          course_id: fixture.courseId,
          member_id: member.id,
          buyer_email: MEMBER_EMAIL,
        },
      })
    );
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    try {
      const response = await request.post("/api/webhooks/stripe", {
        data: payload,
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
      });

      expect(response.status()).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ received: true });
      await waitForCourseEntitlementByPaymentIntent(paymentIntentId, "active");
    } finally {
      await deleteCourseFixture(fixture.courseId);
    }
  });
});
