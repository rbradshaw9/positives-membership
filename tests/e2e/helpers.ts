import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { Enums } from "@/types/supabase";
import { getPromoterPayPalEmail } from "@/lib/firstpromoter/client";

export const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL ?? "rbradshaw+l1@gmail.com";
export const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD ?? "PiR43Tx2-";
export const LEVEL_2_MEMBER_EMAIL =
  process.env.E2E_LEVEL_2_MEMBER_EMAIL ?? "rbradshaw+l2@gmail.com";
export const LEVEL_2_MEMBER_PASSWORD =
  process.env.E2E_LEVEL_2_MEMBER_PASSWORD ?? "PiR43Tx2-";
export const LEVEL_3_MEMBER_EMAIL =
  process.env.E2E_LEVEL_3_MEMBER_EMAIL ?? "rbradshaw+l3@gmail.com";
export const LEVEL_3_MEMBER_PASSWORD =
  process.env.E2E_LEVEL_3_MEMBER_PASSWORD ?? "PiR43Tx2-";
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "lopcadmin@gmail.com";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "PiR43Tx2-";

const ADMIN_MONTH_WORKSPACE_FIXTURE = {
  marker: "e2e-admin-month-workspace",
  monthYear: "2099-11",
  label: "November 2099",
  monthlyTitle: "Admin Smoke Monthly Theme",
  weeklyTitle: "Admin Smoke Weekly Reflection",
  assignedDailyTitle: "Admin Smoke Assigned Daily",
  unassignedDailyTitle: "Admin Smoke Unassigned Daily",
};

let envLoaded = false;

function ensureLocalEnvLoaded() {
  if (envLoaded) return;

  const envPath = path.join(process.cwd(), ".env.local");
  const raw = readFileSync(envPath, "utf8");

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  envLoaded = true;
}

function getServiceRoleClient() {
  ensureLocalEnvLoaded();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service-role env vars for e2e setup.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function getStripeClient() {
  ensureLocalEnvLoaded();

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY for e2e Stripe setup.");
  }

  return new Stripe(secretKey, {
    apiVersion: "2026-03-25.dahlia",
  });
}

type SubscriptionStatus = Enums<"subscription_status">;
type SubscriptionTier = Enums<"subscription_tier">;
type LifecycleSequenceTable =
  | "onboarding_sequence"
  | "payment_recovery_sequence"
  | "winback_sequence";
export type AdminMemberSupportSnapshot = {
  name: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_tier: SubscriptionTier | null;
  subscription_end_date: string | null;
  password_set: boolean;
  practice_streak: number;
  last_practiced_at: string | null;
};

export type AdminAccessSnapshot = {
  roleKeys: string[];
  permissionOverrides: Array<{ permission: string; allowed: boolean }>;
};

export type AdminRolePermissionsSnapshot = {
  roleKey: string;
  permissions: string[];
};

export async function getMemberBillingState(email: string) {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("member")
    .select("id, email, stripe_customer_id, subscription_status, subscription_tier")
    .eq("email", email)
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to fetch member billing state for ${email}: ${error?.message ?? "member not found"}`
    );
  }

  return data;
}

export async function ensureMemberStripeCustomer(email: string) {
  const supabase = getServiceRoleClient();
  const stripe = getStripeClient();
  const member = await getMemberBillingState(email);

  if (member.stripe_customer_id) {
    try {
      await stripe.customers.retrieve(member.stripe_customer_id);
      return member.stripe_customer_id;
    } catch {
      // Fall through to recreate the missing customer.
    }
  }

  const customer = await stripe.customers.create({
    email: member.email,
    metadata: {
      source: "e2e-fixture-repair",
      member_id: member.id,
    },
  });

  const { error } = await supabase
    .from("member")
    .update({ stripe_customer_id: customer.id })
    .eq("id", member.id);

  if (error) {
    throw new Error(
      `Failed to persist repaired stripe_customer_id for ${email}: ${error.message}`
    );
  }

  return customer.id;
}

export async function ensureMemberSavedPaymentMethod(email: string) {
  const stripe = getStripeClient();
  const customerId = await ensureMemberStripeCustomer(email);

  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });

  if (!customer.deleted && customer.invoice_settings.default_payment_method) {
    return customerId;
  }

  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: {
      token: "tok_visa",
    },
  });

  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer: customerId,
  });

  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethod.id,
    },
  });

  return customerId;
}

export async function createCourseEntitlementWebhookFixture({
  memberId,
  paymentIntentId,
  chargeId,
}: {
  memberId: string;
  paymentIntentId: string;
  chargeId?: string | null;
}) {
  const supabase = getServiceRoleClient();
  const slug = `e2e-course-webhook-${paymentIntentId}`;

  const { data: course, error: courseError } = await supabase
    .from("course")
    .insert({
      title: "E2E Course Webhook Fixture",
      slug,
      status: "published",
      tier_min: "level_1",
      is_standalone_purchasable: true,
      price_cents: 5000,
      admin_notes: "e2e-course-webhook-fixture",
    })
    .select("id")
    .single();

  if (courseError || !course) {
    throw new Error(
      `Failed to create course webhook fixture: ${courseError?.message ?? "unknown error"}`
    );
  }

  const { data: entitlement, error: entitlementError } = await supabase
    .from("course_entitlement")
    .insert({
      member_id: memberId,
      course_id: course.id,
      source: "purchase",
      status: "active",
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: chargeId ?? null,
      grant_note: "E2E course webhook fixture.",
    })
    .select("id")
    .single();

  if (entitlementError || !entitlement) {
    await supabase.from("course").delete().eq("id", course.id);
    throw new Error(
      `Failed to create course entitlement webhook fixture: ${entitlementError?.message ?? "unknown error"}`
    );
  }

  return {
    courseId: course.id,
    entitlementId: entitlement.id,
  };
}

export async function createStandaloneCourseFixture(
  slugSeed: string,
  options?: {
    withOutline?: boolean;
    grantToMemberId?: string | null;
    priceCents?: number;
    title?: string;
    description?: string | null;
  }
) {
  const supabase = getServiceRoleClient();
  const stripe = getStripeClient();
  const slug = `e2e-course-${slugSeed}`;
  const amountCents = options?.priceCents ?? 5000;
  const title = options?.title ?? "E2E Standalone Course Fixture";
  const description =
    options?.description ?? "A focused course fixture for checkout and course-store verification.";

  const product = await stripe.products.create({
    name: title,
    description,
    metadata: {
      source: "positives-e2e",
      slug,
    },
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: amountCents,
    metadata: {
      source: "positives-e2e",
      slug,
    },
  });

  const { data: course, error } = await supabase
    .from("course")
    .insert({
      title,
      slug,
      status: "published",
      tier_min: "level_1",
      is_standalone_purchasable: true,
      description,
      price_cents: amountCents,
      stripe_product_id: product.id,
      stripe_price_id: price.id,
      admin_notes: "e2e-standalone-course-fixture",
    })
    .select("id")
    .single();

  if (error || !course) {
    throw new Error(
      `Failed to create standalone course fixture: ${error?.message ?? "unknown error"}`
    );
  }

  if (options?.withOutline) {
    const { data: module, error: moduleError } = await supabase
      .from("course_module")
      .insert({
        course_id: course.id,
        title: "Module 1: Foundations",
        description: "A calm first section for previewing the course outline.",
        sort_order: 1,
      })
      .select("id")
      .single();

    if (moduleError || !module) {
      throw new Error(
        `Failed to create standalone course module fixture: ${moduleError?.message ?? "unknown error"}`
      );
    }

    const { error: lessonError } = await supabase.from("course_lesson").insert([
      {
        module_id: module.id,
        title: "Lesson 1: Setting a gentler rhythm",
        description: "The first preview lesson.",
        sort_order: 1,
      },
      {
        module_id: module.id,
        title: "Lesson 2: Returning without pressure",
        description: "The second preview lesson.",
        sort_order: 2,
      },
    ]);

    if (lessonError) {
      throw new Error(
        `Failed to create standalone course lesson fixtures: ${lessonError.message}`
      );
    }
  }

  if (options?.grantToMemberId) {
    const { error: entitlementError } = await supabase.from("course_entitlement").insert({
      member_id: options.grantToMemberId,
      course_id: course.id,
      source: "purchase",
      status: "active",
      grant_note: "E2E standalone course fixture ownership grant.",
    });

    if (entitlementError) {
      throw new Error(
        `Failed to create standalone course entitlement fixture: ${entitlementError.message}`
      );
    }
  }

  return {
    courseId: course.id,
    courseSlug: slug,
    stripePriceId: price.id,
    stripeProductId: product.id,
  };
}

export async function deleteCourseFixture(courseId: string) {
  const supabase = getServiceRoleClient();
  const stripe = getStripeClient();
  const { data: course } = await supabase
    .from("course")
    .select("stripe_product_id")
    .eq("id", courseId)
    .maybeSingle();

  const { error } = await supabase.from("course").delete().eq("id", courseId);

  if (error) {
    throw new Error(`Failed to delete course fixture ${courseId}: ${error.message}`);
  }

  if (course?.stripe_product_id) {
    try {
      await stripe.products.update(course.stripe_product_id, { active: false });
    } catch {
      // Test cleanup should not fail just because Stripe fixture archival did not complete.
    }
  }
}

export async function waitForCourseEntitlementStatus(
  entitlementId: string,
  expectedStatus: "active" | "revoked" | "refunded" | "chargeback",
  timeoutMs = 10_000
) {
  const supabase = getServiceRoleClient();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("course_entitlement")
      .select("status")
      .eq("id", entitlementId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch entitlement ${entitlementId}: ${error.message}`);
    }

    if (data.status === expectedStatus) {
      return data;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Entitlement ${entitlementId} did not reach status ${expectedStatus}.`);
}

export async function waitForCourseEntitlementByPaymentIntent(
  paymentIntentId: string,
  expectedStatus: "active" | "revoked" | "refunded" | "chargeback" = "active",
  timeoutMs = 10_000
) {
  const supabase = getServiceRoleClient();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("course_entitlement")
      .select("id, status")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch entitlement for ${paymentIntentId}: ${error.message}`);
    }

    if (data?.status === expectedStatus) {
      return data;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Payment intent ${paymentIntentId} did not create ${expectedStatus} entitlement.`);
}

export async function waitForMemberBillingState(
  email: string,
  expected: {
    subscription_status: SubscriptionStatus;
    subscription_tier: SubscriptionTier | null;
  },
  timeoutMs = 10_000
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const state = await getMemberBillingState(email);
    if (
      state.subscription_status === expected.subscription_status &&
      state.subscription_tier === expected.subscription_tier
    ) {
      return state;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const finalState = await getMemberBillingState(email);
  throw new Error(
    `Member ${email} never reached expected billing state ${expected.subscription_status}/${expected.subscription_tier}. ` +
      `Final state was ${finalState.subscription_status}/${finalState.subscription_tier}.`
  );
}

export async function getAdminMemberSupportSnapshot(
  email: string
): Promise<AdminMemberSupportSnapshot> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("member")
    .select(
      "name, stripe_customer_id, subscription_status, subscription_tier, subscription_end_date, password_set, practice_streak, last_practiced_at"
    )
    .eq("email", email)
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to fetch admin member support snapshot for ${email}: ${error?.message ?? "member not found"}`
    );
  }

  return data;
}

export async function updateAdminMemberSupportFields(
  email: string,
  fields: Partial<AdminMemberSupportSnapshot>
) {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("member").update(fields).eq("email", email);

  if (error) {
    throw new Error(`Failed to update admin member support fields for ${email}: ${error.message}`);
  }
}

export async function getAdminAccessSnapshot(email: string): Promise<AdminAccessSnapshot> {
  const supabase = getServiceRoleClient();
  const { data: member, error: memberError } = await supabase
    .from("member")
    .select("id")
    .eq("email", email)
    .single();

  if (memberError || !member) {
    throw new Error(
      `Failed to fetch member for admin access snapshot ${email}: ${memberError?.message ?? "member not found"}`
    );
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("admin_user_role")
    .select("role_id")
    .eq("member_id", member.id);

  if (assignmentError) {
    throw new Error(`Failed to fetch admin roles for ${email}: ${assignmentError.message}`);
  }

  const roleIds = (assignments ?? []).map((row) => String(row.role_id));
  let roleKeys: string[] = [];

  if (roleIds.length > 0) {
    const { data: roles, error: roleError } = await supabase
      .from("admin_role")
      .select("id, key")
      .in("id", roleIds);

    if (roleError) {
      throw new Error(`Failed to resolve admin role keys for ${email}: ${roleError.message}`);
    }

    const roleKeyById = new Map((roles ?? []).map((role) => [String(role.id), String(role.key)]));
    roleKeys = roleIds
      .map((roleId) => roleKeyById.get(roleId))
      .filter((value): value is string => Boolean(value));
  }

  const { data: overrides, error: overrideError } = await supabase
    .from("admin_user_permission_override")
    .select("permission, allowed")
    .eq("member_id", member.id)
    .order("permission", { ascending: true });

  if (overrideError) {
    throw new Error(`Failed to fetch permission overrides for ${email}: ${overrideError.message}`);
  }

  return {
    roleKeys,
    permissionOverrides: (overrides ?? []).map((override) => ({
      permission: String(override.permission),
      allowed: Boolean(override.allowed),
    })),
  };
}

export async function replaceAdminAccess(email: string, snapshot: AdminAccessSnapshot) {
  const supabase = getServiceRoleClient();
  const { data: member, error: memberError } = await supabase
    .from("member")
    .select("id")
    .eq("email", email)
    .single();

  if (memberError || !member) {
    throw new Error(
      `Failed to fetch member for admin access restore ${email}: ${memberError?.message ?? "member not found"}`
    );
  }

  const memberId = String(member.id);

  const { error: deleteRoleError } = await supabase
    .from("admin_user_role")
    .delete()
    .eq("member_id", memberId);
  if (deleteRoleError) {
    throw new Error(`Failed to clear admin roles for ${email}: ${deleteRoleError.message}`);
  }

  const { error: deleteOverrideError } = await supabase
    .from("admin_user_permission_override")
    .delete()
    .eq("member_id", memberId);
  if (deleteOverrideError) {
    throw new Error(`Failed to clear permission overrides for ${email}: ${deleteOverrideError.message}`);
  }

  if (snapshot.roleKeys.length > 0) {
    const { data: roles, error: roleLookupError } = await supabase
      .from("admin_role")
      .select("id, key")
      .in("key", snapshot.roleKeys);

    if (roleLookupError) {
      throw new Error(`Failed to resolve role ids for ${email}: ${roleLookupError.message}`);
    }

    const roleIdByKey = new Map((roles ?? []).map((role) => [String(role.key), String(role.id)]));
    const inserts = snapshot.roleKeys
      .map((roleKey) => roleIdByKey.get(roleKey))
      .filter((value): value is string => Boolean(value))
      .map((roleId) => ({
        member_id: memberId,
        role_id: roleId,
      }));

    if (inserts.length > 0) {
      const { error: insertRoleError } = await supabase.from("admin_user_role").insert(inserts);
      if (insertRoleError) {
        throw new Error(`Failed to restore admin roles for ${email}: ${insertRoleError.message}`);
      }
    }
  }

  if (snapshot.permissionOverrides.length > 0) {
    const { error: insertOverrideError } = await supabase
      .from("admin_user_permission_override")
      .insert(
        snapshot.permissionOverrides.map((override) => ({
          member_id: memberId,
          permission: override.permission,
          allowed: override.allowed,
        }))
      );

    if (insertOverrideError) {
      throw new Error(
        `Failed to restore permission overrides for ${email}: ${insertOverrideError.message}`
      );
    }
  }
}

export async function getAdminRolePermissionsSnapshot(
  roleKey: string
): Promise<AdminRolePermissionsSnapshot> {
  const supabase = getServiceRoleClient();
  const { data: role, error: roleError } = await supabase
    .from("admin_role")
    .select("id, key")
    .eq("key", roleKey)
    .single();

  if (roleError || !role) {
    throw new Error(
      `Failed to fetch admin role ${roleKey}: ${roleError?.message ?? "role not found"}`
    );
  }

  const { data: permissions, error: permissionError } = await supabase
    .from("admin_role_permission")
    .select("permission")
    .eq("role_id", role.id)
    .order("permission", { ascending: true });

  if (permissionError) {
    throw new Error(
      `Failed to fetch admin role permissions for ${roleKey}: ${permissionError.message}`
    );
  }

  return {
    roleKey: String(role.key),
    permissions: (permissions ?? []).map((row) => String(row.permission)),
  };
}

export async function replaceAdminRolePermissions(snapshot: AdminRolePermissionsSnapshot) {
  const supabase = getServiceRoleClient();
  const { data: role, error: roleError } = await supabase
    .from("admin_role")
    .select("id")
    .eq("key", snapshot.roleKey)
    .single();

  if (roleError || !role) {
    throw new Error(
      `Failed to fetch admin role ${snapshot.roleKey} for restore: ${roleError?.message ?? "role not found"}`
    );
  }

  const roleId = String(role.id);
  const { error: deleteError } = await supabase
    .from("admin_role_permission")
    .delete()
    .eq("role_id", roleId);

  if (deleteError) {
    throw new Error(
      `Failed to clear admin role permissions for ${snapshot.roleKey}: ${deleteError.message}`
    );
  }

  if (snapshot.permissions.length > 0) {
    const { error: insertError } = await supabase.from("admin_role_permission").insert(
      snapshot.permissions.map((permission) => ({
        role_id: roleId,
        permission,
      }))
    );

    if (insertError) {
      throw new Error(
        `Failed to restore admin role permissions for ${snapshot.roleKey}: ${insertError.message}`
      );
    }
  }
}

export async function clearLifecycleSequenceRows(memberId: string) {
  const supabase = getServiceRoleClient();

  for (const table of [
    "onboarding_sequence",
    "payment_recovery_sequence",
    "winback_sequence",
  ] as const) {
    const { error } = await supabase.from(table).delete().eq("member_id", memberId);
    if (error) {
      throw new Error(`Failed to clear ${table} rows for ${memberId}: ${error.message}`);
    }
  }
}

export async function getLifecycleSequenceRows(
  table: LifecycleSequenceTable,
  memberId: string
) {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from(table)
    .select("day, send_at")
    .eq("member_id", memberId)
    .order("day", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch ${table} rows for ${memberId}: ${error.message}`);
  }

  return data ?? [];
}

export async function setMemberEmailUnsubscribed(email: string, unsubscribed: boolean) {
  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from("member")
    .update({ email_unsubscribed: unsubscribed })
    .eq("email", email);

  if (error) {
    throw new Error(`Failed to update email_unsubscribed for ${email}: ${error.message}`);
  }
}

export async function getMemberEmailUnsubscribed(email: string) {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("member")
    .select("email_unsubscribed")
    .eq("email", email)
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to fetch email_unsubscribed for ${email}: ${error?.message ?? "member not found"}`
    );
  }

  return Boolean(data.email_unsubscribed);
}

export async function clearSupportSubmissions(email: string) {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("support_submissions").delete().eq("email", email);

  if (error) {
    throw new Error(`Failed to clear support submissions for ${email}: ${error.message}`);
  }
}

export async function getLatestSupportSubmission(email: string) {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("support_submissions")
    .select("name, email, subject, message")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch support submission for ${email}: ${error.message}`);
  }

  return data;
}

export async function resetAffiliateTestState(email: string) {
  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from("member")
    .update({
      fp_promoter_id: null,
      fp_ref_id: null,
      paypal_email: null,
    })
    .eq("email", email);

  if (error) {
    throw new Error(`Failed to reset affiliate test state for ${email}: ${error.message}`);
  }
}

export async function getAffiliatePayoutState(email: string) {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("member")
    .select("fp_promoter_id, paypal_email")
    .eq("email", email)
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to fetch affiliate payout state for ${email}: ${error?.message ?? "member not found"}`
    );
  }

  return {
    localPayPalEmail: data.paypal_email,
    firstPromoterPayPalEmail: data.fp_promoter_id
      ? await getPromoterPayPalEmail(data.fp_promoter_id)
      : null,
  };
}

export async function ensureAdminMonthWorkspaceFixture() {
  const supabase = getServiceRoleClient();

  const { data: existingMonth, error: existingMonthError } = await supabase
    .from("monthly_practice")
    .select("id")
    .eq("month_year", ADMIN_MONTH_WORKSPACE_FIXTURE.monthYear)
    .maybeSingle();

  if (existingMonthError) {
    throw new Error(
      `Failed to look up admin month workspace fixture month: ${existingMonthError.message}`
    );
  }

  let monthId = existingMonth?.id ?? null;

  if (!monthId) {
    const { data: insertedMonth, error: insertMonthError } = await supabase
      .from("monthly_practice")
      .insert({
        month_year: ADMIN_MONTH_WORKSPACE_FIXTURE.monthYear,
        label: ADMIN_MONTH_WORKSPACE_FIXTURE.label,
        status: "draft",
        description: "E2E fixture month for admin publishing smoke coverage.",
        admin_notes: ADMIN_MONTH_WORKSPACE_FIXTURE.marker,
      })
      .select("id")
      .single();

    if (insertMonthError || !insertedMonth) {
      throw new Error(
        `Failed to create admin month workspace fixture month: ${insertMonthError?.message ?? "unknown error"}`
      );
    }

    monthId = insertedMonth.id;
  } else {
    const { error: updateMonthError } = await supabase
      .from("monthly_practice")
      .update({
        label: ADMIN_MONTH_WORKSPACE_FIXTURE.label,
        status: "draft",
        description: "E2E fixture month for admin publishing smoke coverage.",
        admin_notes: ADMIN_MONTH_WORKSPACE_FIXTURE.marker,
      })
      .eq("id", monthId);

    if (updateMonthError) {
      throw new Error(
        `Failed to reset admin month workspace fixture month: ${updateMonthError.message}`
      );
    }
  }

  const { error: deleteFixtureContentError } = await supabase
    .from("content")
    .delete()
    .eq("admin_notes", ADMIN_MONTH_WORKSPACE_FIXTURE.marker);

  if (deleteFixtureContentError) {
    throw new Error(
      `Failed to clear admin month workspace fixture content: ${deleteFixtureContentError.message}`
    );
  }

  const { error: insertFixtureContentError } = await supabase.from("content").insert([
    {
      type: "monthly_theme",
      title: ADMIN_MONTH_WORKSPACE_FIXTURE.monthlyTitle,
      excerpt: "Fixture monthly excerpt",
      body: "Fixture monthly body",
      reflection_prompt: "Fixture monthly reflection prompt",
      status: "draft",
      is_active: false,
      source: "admin",
      admin_notes: ADMIN_MONTH_WORKSPACE_FIXTURE.marker,
      month_year: ADMIN_MONTH_WORKSPACE_FIXTURE.monthYear,
      monthly_practice_id: monthId,
    },
    {
      type: "weekly_principle",
      title: ADMIN_MONTH_WORKSPACE_FIXTURE.weeklyTitle,
      excerpt: "Fixture weekly excerpt",
      body: "Fixture weekly body",
      reflection_prompt: "Fixture weekly reflection prompt",
      status: "draft",
      is_active: false,
      source: "admin",
      admin_notes: ADMIN_MONTH_WORKSPACE_FIXTURE.marker,
      month_year: ADMIN_MONTH_WORKSPACE_FIXTURE.monthYear,
      week_start: "2099-11-02",
      monthly_practice_id: monthId,
    },
    {
      type: "daily_audio",
      title: ADMIN_MONTH_WORKSPACE_FIXTURE.assignedDailyTitle,
      excerpt: "Fixture assigned daily excerpt",
      reflection_prompt: "Fixture assigned daily reflection prompt",
      status: "draft",
      is_active: false,
      source: "admin",
      admin_notes: ADMIN_MONTH_WORKSPACE_FIXTURE.marker,
      month_year: ADMIN_MONTH_WORKSPACE_FIXTURE.monthYear,
      publish_date: "2099-11-03",
      monthly_practice_id: monthId,
      duration_seconds: 180,
      castos_episode_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    {
      type: "daily_audio",
      title: ADMIN_MONTH_WORKSPACE_FIXTURE.unassignedDailyTitle,
      excerpt: "Fixture unassigned daily excerpt",
      reflection_prompt: "Fixture unassigned daily reflection prompt",
      status: "draft",
      is_active: false,
      source: "admin",
      admin_notes: ADMIN_MONTH_WORKSPACE_FIXTURE.marker,
      duration_seconds: 190,
      castos_episode_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    },
  ]);

  if (insertFixtureContentError) {
    throw new Error(
      `Failed to seed admin month workspace fixture content: ${insertFixtureContentError.message}`
    );
  }

  return {
    monthId,
    monthYear: ADMIN_MONTH_WORKSPACE_FIXTURE.monthYear,
    label: ADMIN_MONTH_WORKSPACE_FIXTURE.label,
    titles: {
      monthly: ADMIN_MONTH_WORKSPACE_FIXTURE.monthlyTitle,
      weekly: ADMIN_MONTH_WORKSPACE_FIXTURE.weeklyTitle,
      assignedDaily: ADMIN_MONTH_WORKSPACE_FIXTURE.assignedDailyTitle,
      unassignedDaily: ADMIN_MONTH_WORKSPACE_FIXTURE.unassignedDailyTitle,
    },
  };
}

export async function loginWithPassword(
  page: Page,
  {
    email,
    password,
    next = "/today",
    expectedPath = next,
  }: {
    email: string;
    password: string;
    next?: string;
    expectedPath?: string;
  }
) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  const escapedExpected = expectedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await expect(page).toHaveURL(new RegExp(`${escapedExpected}$`));
}
