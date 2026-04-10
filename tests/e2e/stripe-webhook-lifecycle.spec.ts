import Stripe from "stripe";
import { expect, test } from "@playwright/test";
import {
  getMemberBillingState,
  MEMBER_EMAIL,
  waitForMemberBillingState,
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
});
