"use server";

import type Stripe from "stripe";
import { createCourseCheckoutSession } from "@/server/services/stripe/create-course-checkout";
import { grantPurchasedCourseEntitlement } from "@/server/services/stripe/handle-course-entitlements";
import { getStripe } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

export type CourseCheckoutResult =
  | { status: "checkout"; url: string; message?: string; error?: never }
  | { status: "purchased"; url: string; message: string; error?: never }
  | { status: "owned"; url: string; message: string; error?: never }
  | { status: "error"; error: string; url?: never; message?: never };

type CheckoutCourse = {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  stripe_price_id: string | null;
  is_standalone_purchasable: boolean;
  price_cents: number | null;
};

function idFromExpandable<T extends { id: string }>(value: string | T | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function getSavedPaymentMethodId(stripe: Stripe, customerId: string) {
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });

  if (customer.deleted) return null;

  const defaultPaymentMethod = customer.invoice_settings.default_payment_method;
  const defaultPaymentMethodId = idFromExpandable(defaultPaymentMethod);
  if (defaultPaymentMethodId) return defaultPaymentMethodId;

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
    expand: ["data.default_payment_method"],
  });
  const subscriptionPaymentMethod = subscriptions.data
    .filter((subscription) => subscription.status === "active" || subscription.status === "trialing")
    .map((subscription) => idFromExpandable(subscription.default_payment_method))
    .find(Boolean);
  if (subscriptionPaymentMethod) return subscriptionPaymentMethod;

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 1,
  });

  return paymentMethods.data[0]?.id ?? null;
}

export async function getCourseCheckoutUrl(formData: FormData): Promise<CourseCheckoutResult> {
  const courseId = (formData.get("courseId") as string | null)?.trim();

  if (!courseId) {
    return { status: "error", error: "No course selected. Please try again." };
  }

  const supabase = asLooseSupabaseClient(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: course, error: courseError } = await supabase
    .from("course")
    .select<CheckoutCourse>(
      "id, title, slug, status, stripe_price_id, is_standalone_purchasable, price_cents"
    )
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();

  if (courseError || !course) {
    console.error("[courses] checkout course lookup failed:", courseError?.message);
    return { status: "error", error: "That course is not available right now." };
  }

  if (!course.is_standalone_purchasable || !course.stripe_price_id) {
    return {
      status: "error",
      error: "This course is not available for standalone purchase yet.",
    };
  }

  let member:
    | { id: string; email: string | null; stripe_customer_id: string | null }
    | null = null;

  if (user) {
    const { data: memberRow } = await supabase
      .from("member")
      .select<{ id: string; email: string | null; stripe_customer_id: string | null }>(
        "id, email, stripe_customer_id"
      )
      .eq("id", user.id)
      .maybeSingle();

    member = memberRow ?? null;

    const { data: entitlement } = await supabase
      .from("course_entitlement")
      .select<{ id: string }>("id")
      .eq("member_id", user.id)
      .eq("course_id", courseId)
      .eq("status", "active")
      .maybeSingle();

    if (entitlement) {
      return {
        status: "owned",
        url: "/library",
        message: "You already own this course. It is waiting in your library.",
      };
    }
  }

  try {
    if (member?.stripe_customer_id && member.email && course.price_cents) {
      const stripe = getStripe();
      const paymentMethodId = await getSavedPaymentMethodId(stripe, member.stripe_customer_id);

      if (paymentMethodId) {
        try {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: course.price_cents,
            currency: "usd",
            customer: member.stripe_customer_id,
            payment_method: paymentMethodId,
            confirm: true,
            off_session: true,
            description: `Positives course: ${course.title}`,
            metadata: {
              purchase_type: "course",
              course_id: course.id,
              courseId: course.id,
              courseTitle: course.title,
              member_id: member.id,
              userId: member.id,
              buyer_email: member.email,
            },
            expand: ["latest_charge"],
          });

          if (paymentIntent.status === "succeeded") {
            await grantPurchasedCourseEntitlement({
              memberId: member.id,
              courseId: course.id,
              stripeCustomerId: member.stripe_customer_id,
              stripePaymentIntentId: paymentIntent.id,
              stripeChargeId: idFromExpandable(paymentIntent.latest_charge),
              grantNote: `Purchased through saved-card payment ${paymentIntent.id}.`,
            });

            return {
              status: "purchased",
              url: "/library",
              message: `${course.title} has been added to your library.`,
            };
          }
        } catch (quickPurchaseError) {
          console.warn(
            "[courses] saved-card course purchase fell back to Checkout:",
            quickPurchaseError instanceof Error
              ? quickPurchaseError.message
              : String(quickPurchaseError)
          );
        }
      }
    }

    const { url } = await createCourseCheckoutSession({
      courseId,
      courseTitle: course.title,
      priceId: course.stripe_price_id,
      userId: member?.id ?? user?.id ?? null,
      customerId: member?.stripe_customer_id ?? null,
      customerEmail: member?.email ?? user?.email ?? null,
      sourcePath: `/courses${course.slug ? `#${course.slug}` : ""}`,
    });

    return { status: "checkout", url };
  } catch (error) {
    console.error(
      "[courses] checkout creation failed:",
      error instanceof Error ? error.message : String(error)
    );
    return { status: "error", error: "Could not start checkout. Please try again." };
  }
}
