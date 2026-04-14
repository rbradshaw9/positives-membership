import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getMemberDetail,
  getMemberRecentActivity,
  getMemberStats,
  getContentTitleMap,
} from "@/lib/queries/get-admin-members";
import { PLAN_NAME_BY_TIER } from "@/lib/plans";

/**
 * app/admin/members/[id]/page.tsx
 * Admin member detail — redesigned with admin-* CSS system.
 *
 * Read-only operational view:
 *   - Full member profile (email, name, tier, status, Stripe ID, streak, etc.)
 *   - Four at-a-glance stat cards (streak, listens, notes, last active)
 *   - Recent activity_event timeline with content titles resolved in one batch
 *
 * No mutation controls. Billing remains exclusively in Stripe Dashboard.
 */

export const metadata = {
  title: "Member Detail — Positives Admin",
};

// ─────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active: "admin-badge admin-badge--active",
  past_due: "admin-badge admin-badge--past-due",
  canceled: "admin-badge admin-badge--canceled",
  trialing: "admin-badge admin-badge--trialing",
  inactive: "admin-badge admin-badge--inactive",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  past_due: "Past Due",
  canceled: "Canceled",
  trialing: "Trialing",
  inactive: "Inactive",
};

const TIER_BADGE: Record<string, string> = {
  level_1: "admin-badge admin-badge--l1",
  level_2: "admin-badge admin-badge--l2",
  level_3: "admin-badge admin-badge--l3",
  level_4: "admin-badge admin-badge--l4",
};

const TIER_LABEL: Record<string, string> = PLAN_NAME_BY_TIER;

// Events that meaningfully relate to a piece of content
const CONTENT_EVENT_TYPES = new Set([
  "daily_listened",
  "daily_started",
  "weekly_viewed",
  "monthly_viewed",
  "note_created",
  "note_updated",
  "note_deleted",
  "event_attended",
  "qa_submitted",
  "qa_viewed",
]);

const EVENT_LABEL: Record<string, string> = {
  session_start: "Session started",
  daily_listened: "Daily audio completed",
  daily_started: "Daily audio started",
  weekly_viewed: "Weekly principle viewed",
  monthly_viewed: "Monthly theme viewed",
  note_created: "Note created",
  note_updated: "Note updated",
  note_deleted: "Note deleted",
  journal_opened: "Journal opened",
  event_attended: "Event attended",
  qa_submitted: "Question submitted",
  qa_viewed: "Q&A viewed",
  milestone_reached: "Streak milestone reached",
  upgrade_prompt_seen: "Upgrade prompt seen",
  upgrade_clicked: "Upgrade clicked",
};

// Dot color tokens (kept as inline styles to avoid Tailwind dep)
const EVENT_DOT_COLOR: Record<string, string> = {
  daily_listened: "#22c55e",
  daily_started: "#86efac",
  weekly_viewed: "#60a5fa",
  monthly_viewed: "#fbbf24",
  note_created: "#a78bfa",
  note_updated: "#c4b5fd",
  note_deleted: "#f87171",
  milestone_reached: "#facc15",
};

function getEventDotColor(type: string): string {
  return EVENT_DOT_COLOR[type] ?? "var(--color-muted-fg)";
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "Never";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function getDaysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────

function ProfileField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <dt
        style={{
          fontSize: "0.6875rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-muted-fg)",
        }}
      >
        {label}
      </dt>
      <dd style={{ fontSize: "0.875rem", color: "var(--color-foreground)" }}>
        {children}
      </dd>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────

type PageParams = Promise<{ id: string }>;

export default async function AdminMemberDetailPage({
  params,
}: {
  params: PageParams;
}) {
  await requireAdmin();

  const { id } = await params;

  const [member, activity, stats] = await Promise.all([
    getMemberDetail(id),
    getMemberRecentActivity(id, 20),
    getMemberStats(id),
  ]);

  if (!member) {
    notFound();
  }

  // Batch-resolve content titles for events that have a content_id
  const contentTitleMap = await getContentTitleMap(
    activity.map((e) => e.content_id)
  );

  const stripeUrl = member.stripe_customer_id
    ? `https://dashboard.stripe.com/customers/${member.stripe_customer_id}`
    : null;
  const daysSincePractice = getDaysSince(member.last_practiced_at);
  const supportFlags = [
    !member.stripe_customer_id
      ? {
          tone: "warning",
          title: "Missing Stripe customer link",
          body:
            "There is no direct billing handoff yet. Check the original checkout and webhook trail before trying to resolve billing from admin.",
        }
      : null,
    member.subscription_status === "past_due"
      ? {
          tone: "warning",
          title: "Billing needs attention",
          body:
            "The member is marked past due. Use the Stripe Dashboard to inspect payment retries, invoices, and saved payment methods.",
        }
      : null,
    member.subscription_status === "canceled"
      ? {
          tone: "info",
          title: "Canceled membership",
          body: member.subscription_end_date
            ? `Access is set to end on ${formatDate(member.subscription_end_date)}. Double-check whether any follow-up is needed before that date.`
            : "This membership is canceled. Confirm whether support needs to clarify access timing or billing history.",
        }
      : null,
    !member.password_set
      ? {
          tone: "info",
          title: "Password not set",
          body:
            "This member is still relying on magic-link access. If they are confused about sign-in, route them through the password reset flow.",
        }
      : null,
    daysSincePractice === null
      ? {
          tone: "info",
          title: "No practice activity yet",
          body:
            "The member has not logged any practice yet. If this is a recent signup, that may be normal. Otherwise it may signal onboarding friction.",
        }
      : daysSincePractice >= 14
        ? {
            tone: "warning",
            title: "Member may be drifting",
            body: `No recorded practice for ${daysSincePractice} day${daysSincePractice === 1 ? "" : "s"}. If support reaches out, start with re-engagement rather than billing assumptions.`,
          }
        : null,
  ].filter(Boolean) as { tone: "warning" | "info"; title: string; body: string }[];

  return (
    <div style={{ maxWidth: "48rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Back nav */}
      <Link href="/admin/members" className="admin-back-link">
        ← All members
      </Link>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            className="admin-page-header__title"
            style={{ marginBottom: "0.25rem" }}
          >
            {member.name ?? member.email}
          </h1>
          {member.name && (
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted-fg)" }}>
              {member.email}
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span
            className={
              STATUS_BADGE[member.subscription_status] ?? STATUS_BADGE.inactive
            }
          >
            {STATUS_LABEL[member.subscription_status] ?? member.subscription_status}
          </span>
          {member.subscription_tier && (
            <span
              className={
                TIER_BADGE[member.subscription_tier] ?? "admin-badge admin-badge--l1"
              }
            >
              {TIER_LABEL[member.subscription_tier] ?? member.subscription_tier}
            </span>
          )}
          {member.subscription_tier !== "level_4" && (
            <Link
              href={`/admin/members/${member.id}/assign-l4`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--color-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "9999px",
                padding: "0.3rem 0.75rem",
                textDecoration: "none",
                background: "var(--color-card)",
                transition: "background 0.15s",
              }}
            >
              Assign L4 →
            </Link>
          )}
        </div>

      </div>

      {/* ── At-a-glance stats ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))",
          gap: "0.875rem",
        }}
      >
        {/* Streak */}
        <div className="admin-stat-card" style={{ textAlign: "center", padding: "1rem" }}>
          <div className="admin-stat-card__value">
            {member.practice_streak}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-muted-fg)", marginTop: "0.125rem" }}>
            {member.practice_streak === 1 ? "day" : "days"}
          </div>
          <div className="admin-stat-card__label" style={{ marginTop: "0.375rem" }}>
            Streak
          </div>
        </div>

        {/* Listens */}
        <div className="admin-stat-card" style={{ textAlign: "center", padding: "1rem" }}>
          <div className="admin-stat-card__value">{stats.listenCount}</div>
          <div className="admin-stat-card__label" style={{ marginTop: "0.5rem" }}>
            Listens
          </div>
        </div>

        {/* Journal */}
        <div className="admin-stat-card" style={{ textAlign: "center", padding: "1rem" }}>
          <div className="admin-stat-card__value">{stats.journalCount}</div>
          <div className="admin-stat-card__label" style={{ marginTop: "0.5rem" }}>
            Journal
          </div>
        </div>

        {/* Last active */}
        <div className="admin-stat-card" style={{ textAlign: "center", padding: "1rem" }}>
          <div
            className="admin-stat-card__value"
            style={{
              fontSize: "1rem",
              letterSpacing: "-0.02em",
              color: member.last_practiced_at
                ? "var(--color-foreground)"
                : "var(--color-muted-fg)",
            }}
          >
            {formatRelativeDate(member.last_practiced_at)}
          </div>
          <div className="admin-stat-card__label" style={{ marginTop: "0.5rem" }}>
            Last Active
          </div>
        </div>
      </div>

      {supportFlags.length > 0 && (
        <div className="admin-section">
          <div className="admin-section__header">
            <p className="admin-section__title">Support flags</p>
          </div>
          <div className="admin-section__body">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
                gap: "0.875rem",
              }}
            >
              {supportFlags.map((flag) => (
                <div
                  key={flag.title}
                  style={{
                    borderRadius: "0.875rem",
                    padding: "1rem",
                    border:
                      flag.tone === "warning"
                        ? "1px solid rgba(245,158,11,0.24)"
                        : "1px solid rgba(68,168,216,0.22)",
                    background:
                      flag.tone === "warning"
                        ? "rgba(245,158,11,0.06)"
                        : "rgba(68,168,216,0.06)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                      color:
                        flag.tone === "warning" ? "#b45309" : "#0369a1",
                      marginBottom: "0.35rem",
                    }}
                  >
                    {flag.title}
                  </p>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      lineHeight: 1.6,
                      color: "var(--color-muted-fg)",
                    }}
                  >
                    {flag.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Profile ────────────────────────────────────────────────────────── */}
      <div className="admin-section">
        <div className="admin-section__header">
          <p className="admin-section__title">Profile</p>
        </div>
        <div className="admin-section__body">
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(13rem, 1fr))",
              gap: "1.25rem 2rem",
            }}
          >
            <ProfileField label="Email">{member.email}</ProfileField>

            <ProfileField label="Name">
              {member.name ?? (
                <span style={{ color: "var(--color-muted-fg)" }}>Not set</span>
              )}
            </ProfileField>

            <ProfileField label="Member Since">
              {formatDate(member.created_at)}
            </ProfileField>

            <ProfileField label="Timezone">
              {member.timezone || "—"}
            </ProfileField>

            <ProfileField label="Password Set">
              {member.password_set ? "Yes" : "No — magic link only"}
            </ProfileField>

            <ProfileField label="Subscription End">
              {member.subscription_end_date ? (
                <span style={{ color: "#b45309", fontWeight: 600 }}>
                  {formatDate(member.subscription_end_date)}
                </span>
              ) : (
                <span style={{ color: "var(--color-muted-fg)" }}>Ongoing</span>
              )}
            </ProfileField>

            <ProfileField label="Stripe Customer">
              {stripeUrl ? (
                <a
                  href={stripeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--color-primary)",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    textDecoration: "none",
                  }}
                >
                  {member.stripe_customer_id} ↗
                </a>
              ) : (
                <span style={{ color: "var(--color-muted-fg)" }}>Not linked</span>
              )}
            </ProfileField>

            <ProfileField label="Member ID">
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.6875rem",
                  color: "var(--color-muted-fg)",
                }}
              >
                {member.id}
              </span>
            </ProfileField>
          </dl>
        </div>
      </div>

      {/* ── Billing note ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.625rem",
          background: "var(--color-muted)",
          border: "1px solid var(--color-border)",
          borderRadius: "0.625rem",
          padding: "0.875rem 1rem",
          fontSize: "0.8125rem",
          color: "var(--color-muted-fg)",
        }}
      >
        <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: "0.05rem" }}>ℹ</span>
        <span>
          Billing is managed exclusively in Stripe. To change a subscription,
          issue a refund, or cancel, use{" "}
          {stripeUrl ? (
            <a
              href={stripeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "underline",
                color: "var(--color-foreground)",
              }}
            >
              Stripe Dashboard ↗
            </a>
          ) : (
            "the Stripe Dashboard once this member has a linked customer"
          )}
          {stripeUrl
            ? "."
            : ". If this member should already have billing access, review the checkout/webhook trail before trying to support them from admin."}
        </span>
      </div>

      {/* ── Recent activity ─────────────────────────────────────────────────── */}
      <div className="admin-section">
        <div className="admin-section__header">
          <p className="admin-section__title">Recent Activity</p>
          <span style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)" }}>
            Last {activity.length} events
          </span>
        </div>
        <div className="admin-section__body">
          {activity.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted-fg)" }}>
              No activity recorded yet.
            </p>
          ) : (
            <ol style={{ position: "relative", listStyle: "none", padding: 0, margin: 0 }}>
              {/* Timeline line */}
              <div
                style={{
                  position: "absolute",
                  left: "5px",
                  top: "8px",
                  bottom: "8px",
                  width: "1px",
                  background: "var(--color-border)",
                }}
              />

              {activity.map((event) => {
                const contentTitle =
                  event.content_id && CONTENT_EVENT_TYPES.has(event.event_type)
                    ? contentTitleMap.get(event.content_id)
                    : undefined;

                return (
                  <li
                    key={event.id}
                    style={{
                      position: "relative",
                      display: "flex",
                      gap: "0.875rem",
                      paddingLeft: "1.5rem",
                      paddingBottom: "1rem",
                    }}
                  >
                    {/* Dot */}
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "6px",
                        width: "11px",
                        height: "11px",
                        borderRadius: "50%",
                        background: getEventDotColor(event.event_type),
                        border: "2px solid var(--color-card)",
                        flexShrink: 0,
                      }}
                    />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--color-foreground)",
                          lineHeight: 1.4,
                        }}
                      >
                        {EVENT_LABEL[event.event_type] ?? event.event_type}
                      </p>
                      {contentTitle && (
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-muted-fg)",
                            marginTop: "0.125rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {contentTitle}
                        </p>
                      )}
                      <p
                        style={{
                          fontSize: "0.6875rem",
                          color: "var(--color-muted-fg)",
                          marginTop: "0.125rem",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatDateTime(event.occurred_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
