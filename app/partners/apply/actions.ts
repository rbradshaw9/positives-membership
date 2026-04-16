"use server";

import { headers } from "next/headers";
import { checkAbuseGuard, getClientIp } from "@/lib/security/abuse-guard";
import { getAdminClient } from "@/lib/supabase/admin";

export type PartnerApplicationFormState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; message: string };

const PARTNER_TYPES = new Set([
  "member_partner",
  "coach_or_creator",
  "strategic_partner",
  "other",
]);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidOptionalUrl(value: string) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function submitPartnerApplication(
  _prev: PartnerApplicationFormState,
  formData: FormData
): Promise<PartnerApplicationFormState> {
  const botTrap = formData.get("company")?.toString().trim() ?? "";
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const partnerType = formData.get("partnerType")?.toString().trim() ?? "other";
  const audienceSummary = formData.get("audienceSummary")?.toString().trim() ?? "";
  const websiteUrl = formData.get("websiteUrl")?.toString().trim() ?? "";
  const message = formData.get("message")?.toString().trim() ?? "";
  const agreedToTerms = formData.get("agreedToTerms")?.toString() === "on";

  if (botTrap) {
    return { status: "sent" };
  }

  if (!name || !email || !audienceSummary || !message) {
    return { status: "error", message: "Please fill in all required fields." };
  }

  if (!isValidEmail(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  if (!PARTNER_TYPES.has(partnerType)) {
    return { status: "error", message: "Please choose the partner type that fits best." };
  }

  if (!agreedToTerms) {
    return { status: "error", message: "Please agree to the affiliate terms before applying." };
  }

  if (audienceSummary.length > 600) {
    return { status: "error", message: "Please keep your audience summary under 600 characters." };
  }

  if (message.length > 4000) {
    return { status: "error", message: "Please keep your message under 4,000 characters." };
  }

  if (!isValidOptionalUrl(websiteUrl)) {
    return { status: "error", message: "Please enter a valid website or profile URL." };
  }

  try {
    const headerList = await headers();
    const clientIp = getClientIp(headerList);
    const guard = await checkAbuseGuard({
      scope: "partner_application",
      keyParts: [clientIp, email],
      maxHits: 2,
      windowSeconds: 60 * 60 * 24,
      onError: "deny",
    });

    if (!guard.allowed) {
      return {
        status: "error",
        message:
          "We already received a recent application from this address. Please give us a little time, or email support@positives.life if something needs to be corrected.",
      };
    }

    const supabase = getAdminClient();
    const { data: existingMember } = await supabase
      .from("member")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    const { error } = await supabase.from("support_submissions").insert({
      name,
      email,
      subject: "partner_application",
      message: [
        `Partner type: ${partnerType}`,
        `Audience summary: ${audienceSummary}`,
        websiteUrl ? `Website or profile: ${websiteUrl}` : null,
        `Agreed to terms: yes`,
        "",
        message,
      ]
        .filter(Boolean)
        .join("\n"),
      member_id: existingMember?.id ?? null,
    });

    if (error) {
      console.error("[partner-apply] insert error:", error.message);
      return {
        status: "error",
        message: "Something went wrong. Please email support@positives.life and we’ll help directly.",
      };
    }

    return { status: "sent" };
  } catch (error) {
    console.error("[partner-apply] unexpected error:", error);
    return {
      status: "error",
      message: "Something went wrong. Please email support@positives.life and we’ll help directly.",
    };
  }
}
