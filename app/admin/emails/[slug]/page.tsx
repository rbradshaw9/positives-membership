import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";
import { renderTemplateHtml } from "@/lib/email/render";
import { EmailTemplateEditor } from "./EmailTemplateEditor";

export const metadata = {
  title: "Edit Email Template — Positives Admin",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type EmailTemplateRow = {
  slug: string;
  name: string;
  sequence: string;
  day_offset: number;
  send_at_utc_hour: number | null;
  subject: string;
  heading: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  is_active: boolean;
};

const SAMPLE_VARS = {
  firstName: "Ryan",
  dashboardUrl: "https://positives.life/today",
  amountDue: "$37.00",
  nextRetryDate: "May 10, 2026",
  billingUrl: "https://positives.life/account",
  rejoindUrl: "https://positives.life/join",
  unsubscribeUrl: "https://positives.life/unsubscribe?token=preview",
};

const SEQUENCE_LABELS: Record<string, string> = {
  transactional: "Transactional",
  onboarding: "Onboarding Drip",
  winback: "Win-Back",
  payment_recovery: "Payment Recovery",
};

export default async function AdminEmailTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();

  const { slug } = await params;

  const { data: template, error } = await supabase
    .from("email_template")
    .select(
      "slug, name, sequence, day_offset, send_at_utc_hour, subject, heading, body, cta_label, cta_url, is_active"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !template) {
    notFound();
  }

  const previewHtml = renderTemplateHtml(template as EmailTemplateRow, SAMPLE_VARS);

  return (
    <div style={{ maxWidth: "78rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <Link href="/admin/emails" className="admin-back-link">
        ← Email templates
      </Link>

      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">
            {SEQUENCE_LABELS[template.sequence] ?? template.sequence}
          </p>
          <h1 className="admin-page-header__title">{template.name}</h1>
          <p className="admin-page-header__subtitle">
            Edit copy, preview the member experience, and send a test email before the next cron
            run picks up changes.
          </p>
        </div>
      </div>

      <EmailTemplateEditor template={template as EmailTemplateRow} previewHtml={previewHtml} />
    </div>
  );
}
