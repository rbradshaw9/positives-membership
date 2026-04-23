"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth/require-member";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { checkAbuseGuard, getClientIp } from "@/lib/security/abuse-guard";
import { getCurrentSentryRelease } from "@/lib/observability/sentry-env";
import { metricCount, routeBucket } from "@/lib/observability/metrics";
import {
  isBetaFeedbackCategory,
  isBetaFeedbackSeverity,
  type BetaFeedbackCommentVisibility,
  type BetaFeedbackCategory,
  type BetaFeedbackSeverity,
} from "@/lib/beta-feedback/shared";

type ActionState = {
  success?: string;
  error?: string;
};

const BETA_FEEDBACK_BUCKET = "beta-feedback-uploads";
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
const ALLOWED_SCREENSHOT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function clean(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text.length > 0 ? text : null;
}

function getUploadedFile(formData: FormData, key: string) {
  const value = formData.get(key);
  if (value instanceof File && value.size > 0) return value;
  return null;
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return cleaned || "screenshot";
}

function normalizeUrl(raw: string | null) {
  if (!raw) return { pageUrl: null, pagePath: null };

  try {
    const parsed = new URL(raw);
    return {
      pageUrl: parsed.toString(),
      pagePath: `${parsed.pathname}${parsed.search}`,
    };
  } catch {
    return {
      pageUrl: null,
      pagePath: raw.startsWith("/") ? raw : null,
    };
  }
}

export async function submitBetaFeedback(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const member = await requireMember();
  const headerStore = await headers();
  const ip = getClientIp(headerStore);
  const abuseGuard = await checkAbuseGuard({
    scope: "beta-feedback-submit",
    keyParts: [member.id, member.email, ip],
    maxHits: 12,
    windowSeconds: 60 * 60,
    onError: "allow",
  });

  if (!abuseGuard.allowed) {
    metricCount("beta_feedback.submit", 1, {
      outcome: "rate_limited",
    });
    return {
      error: `You're sending feedback pretty quickly right now. Please wait about ${Math.max(abuseGuard.retryAfterSeconds, 60)} seconds and try again.`,
    };
  }

  const summary = clean(formData.get("summary"));
  const details = clean(formData.get("details"));
  const expectedBehavior = clean(formData.get("expectedBehavior"));
  const categoryValue = clean(formData.get("category"));
  const severityValue = clean(formData.get("severity"));
  const loomUrl = clean(formData.get("loomUrl"));
  const pageUrlValue = clean(formData.get("pageUrl"));
  const browserName = clean(formData.get("browserName"));
  const osName = clean(formData.get("osName"));
  const deviceType = clean(formData.get("deviceType"));
  const viewportWidth = clean(formData.get("viewportWidth"));
  const viewportHeight = clean(formData.get("viewportHeight"));
  const timezone = clean(formData.get("timezone"));
  const userAgent = clean(formData.get("userAgent"));
  const submittedFrom = clean(formData.get("submittedFrom")) === "admin_widget"
    ? "admin_widget"
    : "member_widget";
  const screenshot = getUploadedFile(formData, "screenshot");

  if (!summary || summary.length < 8) {
    return { error: "Give us a short summary so we can understand the issue quickly." };
  }

  if (!details || details.length < 16) {
    return { error: "A little more detail will help us reproduce and fix this faster." };
  }

  if (!categoryValue || !isBetaFeedbackCategory(categoryValue)) {
    return { error: "Pick the category that fits best." };
  }

  if (!severityValue || !isBetaFeedbackSeverity(severityValue)) {
    return { error: "Pick how urgent this feels." };
  }

  if (loomUrl) {
    try {
      const parsed = new URL(loomUrl);
      if (!["loom.com", "www.loom.com"].includes(parsed.hostname)) {
        return { error: "Video links should be Loom links for now." };
      }
    } catch {
      return { error: "Add a valid Loom link or leave it blank." };
    }
  }

  let screenshotStoragePath: string | null = null;
  let screenshotFileName: string | null = null;
  let screenshotContentType: string | null = null;
  let screenshotSizeBytes: number | null = null;

  if (screenshot) {
    if (!ALLOWED_SCREENSHOT_TYPES.has(screenshot.type)) {
      return { error: "Screenshot must be a JPEG, PNG, WebP, or GIF image." };
    }

    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      return { error: "Screenshot must be 8 MB or smaller." };
    }

    const adminClient = asLooseSupabaseClient(getAdminClient());
    screenshotStoragePath = `${member.id}/${randomUUID()}-${sanitizeFileName(screenshot.name)}`;
    const { error: uploadError } = await adminClient.storage
      .from(BETA_FEEDBACK_BUCKET)
      .upload(screenshotStoragePath, screenshot, {
        contentType: screenshot.type,
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadError) {
      console.error("[beta-feedback] screenshot upload failed:", uploadError.message);
      metricCount("beta_feedback.submit", 1, {
        outcome: "screenshot_upload_failed",
        severity: severityValue,
        category: categoryValue,
        has_screenshot: true,
      });
      return { error: "We couldn't upload that screenshot right now. Please try again." };
    }

    screenshotFileName = screenshot.name;
    screenshotContentType = screenshot.type;
    screenshotSizeBytes = screenshot.size;
  }

  const { pageUrl, pagePath } = normalizeUrl(pageUrlValue);
  const adminClient = asLooseSupabaseClient(getAdminClient());

  const { error } = await adminClient
    .from("beta_feedback_submission")
    .insert({
    member_id: member.id,
    member_email: member.email,
    member_name: member.name ?? null,
    summary,
    details,
    expected_behavior: expectedBehavior,
    category: categoryValue satisfies BetaFeedbackCategory,
    severity: severityValue satisfies BetaFeedbackSeverity,
    status: "new",
    page_path: pagePath,
    page_url: pageUrl,
    app_release: getCurrentSentryRelease(),
    browser_name: browserName,
    os_name: osName,
    device_type: deviceType,
    viewport_width: viewportWidth ? Number.parseInt(viewportWidth, 10) : null,
    viewport_height: viewportHeight ? Number.parseInt(viewportHeight, 10) : null,
    user_agent: userAgent,
    timezone,
    loom_url: loomUrl,
    screenshot_storage_path: screenshotStoragePath,
    screenshot_file_name: screenshotFileName,
    screenshot_content_type: screenshotContentType,
    screenshot_size_bytes: screenshotSizeBytes,
    stripe_customer_id: member.stripe_customer_id ?? null,
    subscription_tier: member.subscription_tier ?? null,
    subscription_status: member.subscription_status ?? null,
    metadata: {
      submitted_from: submittedFrom,
      member_has_password: member.password_set === true,
      marketing_opted_out: member.email_unsubscribed === true,
    },
    });

  if (error) {
    console.error("[beta-feedback] insert failed:", error.message);
    metricCount("beta_feedback.submit", 1, {
      outcome: "insert_failed",
      severity: severityValue,
      category: categoryValue,
      has_screenshot: Boolean(screenshotStoragePath),
      has_loom: Boolean(loomUrl),
      page: routeBucket(pagePath),
    });
    return { error: "We couldn't send your feedback right now. Please try again in a moment." };
  }

  metricCount("beta_feedback.submit", 1, {
    outcome: "success",
    severity: severityValue,
    category: categoryValue,
    has_screenshot: Boolean(screenshotStoragePath),
    has_loom: Boolean(loomUrl),
    page: routeBucket(pagePath),
  });

  revalidatePath("/admin/beta-feedback");

  return {
    success: "Thanks. Your feedback is in the queue, and we captured the page context for the team.",
  };
}

export async function replyToBetaFeedback(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const member = await requireMember();
  const feedbackId = clean(formData.get("feedbackId"));
  const body = clean(formData.get("body"));

  if (!feedbackId) {
    return { error: "Missing feedback thread." };
  }

  if (!body || body.length < 4) {
    return { error: "Add a little more detail so the team can follow along." };
  }

  const adminClient = asLooseSupabaseClient(getAdminClient());
  const { data: feedback, error: feedbackError } = await adminClient
    .from("beta_feedback_submission")
    .select<{ id: string; member_id: string | null }>("id, member_id")
    .eq("id", feedbackId)
    .maybeSingle();

  if (feedbackError || !feedback || feedback.member_id !== member.id) {
    return { error: "We couldn't open that feedback thread." };
  }

  const visibility: BetaFeedbackCommentVisibility = "member";
  const { error } = await adminClient.from("beta_feedback_comment").insert({
    feedback_submission_id: feedbackId,
    author_member_id: member.id,
    author_name: member.name ?? null,
    author_email: member.email,
    author_kind: "member",
    visibility,
    body,
    metadata: {
      submitted_from: "member_widget",
    },
  });

  if (error) {
    console.error("[beta-feedback] member reply failed:", error.message);
    return { error: "We couldn't send that reply right now. Please try again." };
  }

  await adminClient
    .from("beta_feedback_submission")
    .update({
      updated_at: new Date().toISOString(),
      member_last_viewed_at: new Date().toISOString(),
    })
    .eq("id", feedbackId);

  revalidatePath("/admin/beta-feedback");
  revalidatePath("/today");
  revalidatePath("/community");

  return { success: "Reply sent." };
}

export async function markBetaFeedbackThreadViewed(feedbackId: string) {
  const member = await requireMember();
  if (!feedbackId) return;

  const adminClient = asLooseSupabaseClient(getAdminClient());
  const { data: feedback, error: feedbackError } = await adminClient
    .from("beta_feedback_submission")
    .select<{ id: string; member_id: string | null }>("id, member_id")
    .eq("id", feedbackId)
    .maybeSingle();

  if (feedbackError || !feedback || feedback.member_id !== member.id) {
    return;
  }

  await adminClient
    .from("beta_feedback_submission")
    .update({
      member_last_viewed_at: new Date().toISOString(),
    })
    .eq("id", feedbackId);

  revalidatePath("/today");
  revalidatePath("/community");
}
