import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Enums } from "@/types/supabase";

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

type SubscriptionStatus = Enums<"subscription_status">;
type SubscriptionTier = Enums<"subscription_tier">;
type LifecycleSequenceTable =
  | "onboarding_sequence"
  | "payment_recovery_sequence"
  | "winback_sequence";

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
  }: {
    email: string;
    password: string;
    next?: string;
  }
) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  const escapedNext = next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await expect(page).toHaveURL(new RegExp(`${escapedNext}$`));
}
