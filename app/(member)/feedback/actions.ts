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
import { createAsanaTaskForBetaFeedback } from "@/lib/integrations/asana";
import {
  isBetaFeedbackCategory,
  isBetaFeedbackSeverity,
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

  const { data: insertedFeedback, error } = await adminClient
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
    })
    .select<{ id: string }>("id")
    .single();

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

  if (insertedFeedback?.id && ["high", "blocker"].includes(severityValue)) {
    const asanaResult = await createAsanaTaskForBetaFeedback({
      feedbackId: insertedFeedback.id,
      memberEmail: member.email,
      memberName: member.name ?? null,
      summary,
      details,
      expectedBehavior,
      category: categoryValue,
      severity: severityValue,
      pageUrl,
      pagePath,
      browserName,
      osName,
      deviceType,
    });

    if (asanaResult.created) {
      metricCount("beta_feedback.asana_escalation", 1, {
        outcome: "created",
        severity: severityValue,
        category: categoryValue,
      });

      const triageNote = [
        "Auto-escalated to Asana because this was submitted as high/blocker feedback.",
        asanaResult.taskUrl ? `Asana task: ${asanaResult.taskUrl}` : `Asana task ID: ${asanaResult.taskGid}`,
      ]
        .filter(Boolean)
        .join("\n");

      const { error: escalationUpdateError } = await adminClient
        .from("beta_feedback_submission")
        .update({
          triage_notes: triageNote,
          metadata: {
            submitted_from: "member_widget",
            member_has_password: member.password_set === true,
            marketing_opted_out: member.email_unsubscribed === true,
            asana_escalation: {
              task_gid: asanaResult.taskGid,
              task_url: asanaResult.taskUrl,
              created_at: new Date().toISOString(),
            },
          },
        })
        .eq("id", insertedFeedback.id);

      if (escalationUpdateError) {
        console.error("[beta-feedback] Asana escalation metadata update failed:", escalationUpdateError.message);
        metricCount("beta_feedback.asana_escalation", 1, {
          outcome: "metadata_update_failed",
          severity: severityValue,
          category: categoryValue,
        });
      }
    } else {
      console.warn("[beta-feedback] Asana escalation skipped or failed:", asanaResult.reason);
      metricCount("beta_feedback.asana_escalation", 1, {
        outcome: "skipped_or_failed",
        reason: asanaResult.reason?.includes("ASANA_") ? "missing_config" : "api_error",
        severity: severityValue,
        category: categoryValue,
      });
    }
  }

  revalidatePath("/admin/beta-feedback");

  return {
    success: "Thanks. Your feedback is in the queue, and we captured the page context for the team.",
  };
}
