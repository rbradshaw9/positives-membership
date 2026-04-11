import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { renderTemplateHtml } from "@/lib/email/render";

const SAMPLE_VARS = {
  firstName: "Ryan",
  dashboardUrl: "https://positives.life/today",
  amountDue: "$37.00",
  nextRetryDate: "May 10, 2026",
  billingUrl: "https://positives.life/account",
  rejoindUrl: "https://positives.life/join",
  unsubscribeUrl: "https://positives.life/unsubscribe?token=preview",
};

export async function POST(request: Request) {
  await requireAdmin();

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid preview payload." }, { status: 400 });
  }

  const template = {
    subject: typeof body.subject === "string" ? body.subject : "",
    heading: typeof body.heading === "string" ? body.heading : "",
    body: typeof body.body === "string" ? body.body : "",
    cta_label:
      typeof body.cta_label === "string" && body.cta_label.trim() ? body.cta_label.trim() : null,
    cta_url: typeof body.cta_url === "string" && body.cta_url.trim() ? body.cta_url.trim() : null,
  };

  if (!template.subject || !template.heading || !template.body) {
    return NextResponse.json(
      { error: "Subject, heading, and body are required for preview." },
      { status: 400 }
    );
  }

  return new NextResponse(renderTemplateHtml(template, SAMPLE_VARS), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
