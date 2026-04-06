"use server";

import { getAdminClient } from "@/lib/supabase/admin";

export type SupportFormState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; message: string };

export async function submitSupportForm(
  _prev: SupportFormState,
  formData: FormData
): Promise<SupportFormState> {
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";
  const subject = formData.get("subject")?.toString().trim() ?? "general";
  const message = formData.get("message")?.toString().trim() ?? "";

  if (!name || !email || !message) {
    return { status: "error", message: "Please fill in all required fields." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  try {
    const supabase = getAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("support_submissions").insert({
      name,
      email,
      subject,
      message,
    });

    if (error) {
      console.error("[support] insert error:", error.message);
      return {
        status: "error",
        message: "Something went wrong. Please email us directly at support@gopositives.com",
      };
    }

    return { status: "sent" };
  } catch (err) {
    console.error("[support] unexpected error:", err);
    return {
      status: "error",
      message: "Something went wrong. Please email us directly at support@gopositives.com",
    };
  }
}
