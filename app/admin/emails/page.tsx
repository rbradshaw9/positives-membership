/**
 * app/admin/emails/page.tsx
 *
 * Email template manager — lists all templates grouped by sequence.
 * Admins can see timing, status, and click through to edit each template.
 */

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SEQUENCE_LABELS: Record<string, string> = {
  transactional: "Transactional",
  onboarding: "Onboarding Drip",
  winback: "Win-Back",
  payment_recovery: "Payment Recovery",
};

const SEQUENCE_DESCRIPTIONS: Record<string, string> = {
  transactional: "Sent immediately on user actions — welcome, receipt, payment failed.",
  onboarding: "Sent via daily cron after a member joins. Day 3, 7, 14.",
  winback: "Sent via daily cron after a member cancels. Day 1, 14, 30.",
  payment_recovery: "Sent via daily cron after payment fails. Day 1 (immediate), 3, 7.",
};

function formatTiming(dayOffset: number, sendAtUtcHour: number | null): string {
  if (sendAtUtcHour === null) return "Immediate";
  const etHour = ((sendAtUtcHour - 5 + 24) % 24);
  const ampm = etHour >= 12 ? "PM" : "AM";
  const h = etHour % 12 || 12;
  const timeStr = `${h}:00 ${ampm} ET`;
  if (dayOffset === 0) return `Day 0 · ${timeStr}`;
  return `Day ${dayOffset} · ${timeStr}`;
}

type EmailTemplate = {
  id: string;
  slug: string;
  name: string;
  sequence: string;
  day_offset: number;
  send_at_utc_hour: number | null;
  subject: string;
  is_active: boolean;
};

export default async function AdminEmailsPage() {
  await requireAdmin();

  const { data: templates } = await supabase
    .from("email_template")
    .select("id, slug, name, sequence, day_offset, send_at_utc_hour, subject, is_active")
    .order("sequence")
    .order("day_offset");

  const grouped = (templates ?? []).reduce<Record<string, EmailTemplate[]>>((acc, t) => {
    const key = t.sequence as string;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t as EmailTemplate);
    return acc;
  }, {});

  const sequenceOrder = ["transactional", "onboarding", "winback", "payment_recovery"];
  const sortedKeys = [
    ...sequenceOrder.filter((k) => grouped[k]),
    ...Object.keys(grouped).filter((k) => !sequenceOrder.includes(k)),
  ];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            margin: "0 0 6px",
            fontFamily: "var(--font-heading)",
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--color-foreground)",
            letterSpacing: "-0.02em",
          }}
        >
          Email Templates
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "var(--color-muted-fg)", lineHeight: 1.5 }}>
          Edit copy, subject lines, and timing for all automated emails.
          Changes take effect on the next cron run.
        </p>
      </div>

      {/* Sequences */}
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {sortedKeys.map((seq) => (
          <section key={seq}>
            {/* Section header */}
            <div style={{ marginBottom: "12px" }}>
              <h2
                style={{
                  margin: "0 0 4px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--color-foreground)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {SEQUENCE_LABELS[seq] ?? seq}
              </h2>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-muted-fg)" }}>
                {SEQUENCE_DESCRIPTIONS[seq] ?? ""}
              </p>
            </div>

            {/* Template cards */}
            <div
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {(grouped[seq] ?? []).map((template, i) => (
                <Link
                  key={template.slug}
                  href={`/admin/emails/${template.slug}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px 20px",
                    textDecoration: "none",
                    borderTop: i === 0 ? "none" : "1px solid var(--color-border)",
                    transition: "background 120ms ease",
                  }}
                  className="admin-email-row"
                >
                  {/* Status dot */}
                  <span
                    style={{
                      flexShrink: 0,
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: template.is_active ? "#22C55E" : "#A1A1AA",
                    }}
                    title={template.is_active ? "Active" : "Inactive"}
                  />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: "0 0 2px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--color-foreground)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {template.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "var(--color-muted-fg)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {template.subject}
                    </p>
                  </div>

                  {/* Timing badge */}
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--color-muted-fg)",
                      background: "var(--color-muted)",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatTiming(template.day_offset, template.send_at_utc_hour)}
                  </span>

                  {/* Arrow */}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 15 15"
                    fill="none"
                    style={{ flexShrink: 0, color: "var(--color-muted-fg)" }}
                  >
                    <path
                      d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <style>{`
        .admin-email-row:hover { background: var(--color-muted) !important; }
      `}</style>
    </div>
  );
}
