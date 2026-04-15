"use server";

import { headers } from "next/headers";
import { checkAbuseGuard, getClientIp } from "@/lib/security/abuse-guard";
import { getAdminClient } from "@/lib/supabase/admin";

export type SupportFormState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; message: string };

export async function submitSupportForm(
  _prev: SupportFormState,
  formData: FormData
): Promise<SupportFormState> {
  const botTrap = formData.get("website")?.toString().trim() ?? "";
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";
  const subjectRaw = formData.get("subject")?.toString().trim() ?? "general";
  const message = formData.get("message")?.toString().trim() ?? "";
  const subject = ["general", "billing", "technical", "feedback", "cancellation"].includes(subjectRaw)
    ? subjectRaw
    : "general";

  if (botTrap) {
    return { status: "sent" };
  }

  if (!name || !email || !message) {
    return { status: "error", message: "Please fill in all required fields." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  if (message.length > 5000) {
    return {
      status: "error",
      message: "Please keep your message under 5,000 characters.",
    };
  }

  try {
    const headerList = await headers();
    const clientIp = getClientIp(headerList);
    const guard = await checkAbuseGuard({
      scope: "support_form",
      keyParts: [clientIp, email],
      maxHits: 4,
      windowSeconds: 60 * 60,
      onError: "deny",
    });

    if (!guard.allowed) {
      return {
        status: "error",
        message:
          "We already received a recent message from this address. Please wait a bit before sending another, or email support@positives.life if it’s urgent.",
      };
    }

    const supabase = getAdminClient();
    const { error } = await supabase.from("support_submissions").insert({
      name,
      email: email.toLowerCase(),
      subject,
      message,
    });

    if (error) {
      console.error("[support] insert error:", error.message);
      return {
        status: "error",
        message: "Something went wrong. Please email us directly at support@positives.life",
      };
    }

    return { status: "sent" };
  } catch (err) {
    console.error("[support] unexpected error:", err);
    return {
      status: "error",
      message: "Something went wrong. Please email us directly at support@positives.life",
    };
  }
}
