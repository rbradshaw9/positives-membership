import type Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { getStripe } from "@/lib/stripe/config";
import { grantPurchasedCourseEntitlement } from "./handle-course-entitlements";

export type StripeCoursePurchaseRepairStatus =
  | "linked"
  | "repairable"
  | "missing_course"
  | "member_mismatch"
  | "missing_metadata";

export type StripeCoursePurchaseRepairItem = {
  paymentIntentId: string;
  chargeId: string | null;
  amountPaidCents: number;
  currency: string | null;
  occurredAt: string;
  courseId: string | null;
  courseTitle: string;
  metadataMemberId: string | null;
  status: StripeCoursePurchaseRepairStatus;
  detail: string;
};

export type StripeCoursePurchaseRepairPreview = {
  customerId: string;
  items: StripeCoursePurchaseRepairItem[];
  linkedCount: number;
  repairableCount: number;
  missingCourseCount: number;
  memberMismatchCount: number;
  missingMetadataCount: number;
};

export type StripeCoursePurchaseRepairResult = {
  preview: StripeCoursePurchaseRepairPreview;
  repairedCount: number;
  repairedCourseIds: string[];
};

function idFromExpandable<T extends { id: string }>(value: string | T | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
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

export async function inspectMemberStripeCoursePurchases(params: {
  memberId: string;
  stripeCustomerId: string;
}): Promise<StripeCoursePurchaseRepairPreview> {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const intents = await listAllSucceededCoursePaymentIntents(params.stripeCustomerId);
  const courseIds = Array.from(
    new Set(
      intents
        .map((intent) => intent.metadata?.course_id ?? intent.metadata?.courseId ?? null)
        .filter((value): value is string => Boolean(value))
    )
  );

  const courseLookup =
    courseIds.length > 0
      ? await supabase.from("course").select<{ id: string; title: string }[]>("id, title").in("id", courseIds)
      : { data: [] as { id: string; title: string }[], error: null };
  const entitlementLookup =
    courseIds.length > 0
      ? await supabase
          .from("course_entitlement")
          .select<{ course_id: string }[]>("course_id")
          .eq("member_id", params.memberId)
          .eq("status", "active")
          .in("course_id", courseIds)
      : { data: [] as { course_id: string }[], error: null };

  const { data: courses, error: coursesError } = courseLookup;
  const { data: entitlements, error: entitlementsError } = entitlementLookup;

  if (coursesError) {
    throw new Error(`[Stripe] Failed to inspect courses for Stripe repair: ${coursesError.message}`);
  }

  if (entitlementsError) {
    throw new Error(
      `[Stripe] Failed to inspect entitlements for Stripe repair: ${entitlementsError.message}`
    );
  }

  const courseMap = new Map((courses ?? []).map((course) => [course.id, course]));
  const activeCourseIds = new Set((entitlements ?? []).map((entitlement) => entitlement.course_id));

  const items = intents
    .map((intent) => {
      const courseId = intent.metadata?.course_id ?? intent.metadata?.courseId ?? null;
      const metadataMemberId = intent.metadata?.member_id ?? intent.metadata?.userId ?? null;
      const course = courseId ? courseMap.get(courseId) ?? null : null;
      const courseTitle = intent.metadata?.courseTitle ?? course?.title ?? "Course purchase";

      let status: StripeCoursePurchaseRepairStatus;
      let detail: string;

      if (!courseId) {
        status = "missing_metadata";
        detail = "Stripe payment metadata is missing the course ID, so local ownership cannot be repaired automatically.";
      } else if (metadataMemberId && metadataMemberId !== params.memberId) {
        status = "member_mismatch";
        detail =
          "Stripe metadata points at a different member ID, so this needs a manual review before changing ownership.";
      } else if (activeCourseIds.has(courseId)) {
        status = "linked";
        detail = "Local course access is already in place for this Stripe purchase.";
      } else if (!course) {
        status = "missing_course";
        detail =
          "The Stripe payment exists, but the referenced course no longer exists in the app, so this needs a manual data repair.";
      } else {
        status = "repairable";
        detail = "Stripe shows a successful course payment, but the local entitlement is missing and can be repaired.";
      }

      return {
        paymentIntentId: intent.id,
        chargeId: idFromExpandable(intent.latest_charge),
        amountPaidCents: intent.amount_received || intent.amount || 0,
        currency: intent.currency,
        occurredAt: new Date(intent.created * 1000).toISOString(),
        courseId,
        courseTitle,
        metadataMemberId,
        status,
        detail,
      } satisfies StripeCoursePurchaseRepairItem;
    })
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return {
    customerId: params.stripeCustomerId,
    items,
    linkedCount: items.filter((item) => item.status === "linked").length,
    repairableCount: items.filter((item) => item.status === "repairable").length,
    missingCourseCount: items.filter((item) => item.status === "missing_course").length,
    memberMismatchCount: items.filter((item) => item.status === "member_mismatch").length,
    missingMetadataCount: items.filter((item) => item.status === "missing_metadata").length,
  };
}

export async function repairMemberStripeCoursePurchases(params: {
  memberId: string;
  stripeCustomerId: string;
}): Promise<StripeCoursePurchaseRepairResult> {
  const preview = await inspectMemberStripeCoursePurchases(params);
  const repairableByCourse = new Map<string, StripeCoursePurchaseRepairItem>();

  for (const item of preview.items
    .filter((entry) => entry.status === "repairable" && entry.courseId)
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))) {
    if (!item.courseId || repairableByCourse.has(item.courseId)) continue;
    repairableByCourse.set(item.courseId, item);
  }

  const repairedCourseIds: string[] = [];

  for (const item of repairableByCourse.values()) {
    if (!item.courseId) continue;

    const result = await grantPurchasedCourseEntitlement({
      memberId: params.memberId,
      courseId: item.courseId,
      stripeCustomerId: params.stripeCustomerId,
      stripePaymentIntentId: item.paymentIntentId,
      stripeChargeId: item.chargeId,
      purchasedAt: item.occurredAt,
      grantNote: `Repaired from historical Stripe course purchase ${item.paymentIntentId}.`,
    });

    if (result.granted) {
      repairedCourseIds.push(item.courseId);
    }
  }

  return {
    preview,
    repairedCount: repairedCourseIds.length,
    repairedCourseIds,
  };
}
