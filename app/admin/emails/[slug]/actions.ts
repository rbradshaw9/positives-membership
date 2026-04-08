"use server";

import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function saveEmailTemplate(slug: string, formData: FormData) {
  await requireAdmin();

  const subject = (formData.get("subject") as string)?.trim();
  const heading = (formData.get("heading") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const cta_label = (formData.get("cta_label") as string)?.trim() || null;
  const cta_url = (formData.get("cta_url") as string)?.trim() || null;
  const day_offset = parseInt(formData.get("day_offset") as string, 10);
  const send_at_utc_hour_raw = formData.get("send_at_utc_hour") as string;
  const send_at_utc_hour =
    send_at_utc_hour_raw === "" || send_at_utc_hour_raw === "immediate"
      ? null
      : parseInt(send_at_utc_hour_raw, 10);
  const is_active = formData.get("is_active") === "true";

  if (!subject || !heading || !body) {
    throw new Error("Subject, heading, and body are required.");
  }

  const { error } = await supabase
    .from("email_template")
    .update({ subject, heading, body, cta_label, cta_url, day_offset, send_at_utc_hour, is_active })
    .eq("slug", slug);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/emails/${slug}`);
  revalidatePath("/admin/emails");
}

export async function sendTestEmail(slug: string, recipientEmail: string) {
  await requireAdmin();

  const { data: template } = await supabase
    .from("email_template")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!template) throw new Error("Template not found");

  const { renderTemplateHtml, renderTemplateText } = await import("@/lib/email/render");
  const { resend, FROM_ADDRESS, REPLY_TO } = await import("@/lib/email/resend");

  const vars = {
    firstName: "Test",
    dashboardUrl: "https://positives.life/today",
    amountDue: "$37.00",
    nextRetryDate: "April 30, 2026",
    billingUrl: "https://positives.life/account/billing",
    rejoindUrl: "https://positives.life/join",
  };

  const html = renderTemplateHtml(template, vars);
  const text = renderTemplateText(template, vars);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    replyTo: REPLY_TO,
    to: recipientEmail,
    subject: `[TEST] ${template.subject}`,
    html,
    text,
  });

  if (error) throw new Error(error.message);
}
