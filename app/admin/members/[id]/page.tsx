import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getMemberDetail,
  getMemberRecentActivity,
  getMemberStats,
  getContentTitleMap,
} from "@/lib/queries/get-admin-members";

/**
 * app/admin/members/[id]/page.tsx
 * Admin member detail — Sprint 12 + polish pass.
 *
 * Read-only operational view. Shows:
 *   - Full member profile (email, name, tier, status, Stripe ID, streak, etc.)
 *   - Four at-a-glance stats (streak, listens, notes, last active)
 *   - Profile fields ordered by support relevance
 *   - Recent activity_event timeline with content titles resolved in one batch query
 *
 * No mutation controls. Billing remains exclusively in Stripe Dashboard.
 */

export const metadata = {
  title: "Member Detail — Positives Admin",
};

// ─────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  past_due:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  canceled: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  trialing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  inactive: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  past_due: "Past Due",
  canceled: "Canceled",
  trialing: "Trialing",
  inactive: "Inactive",
};

const TIER_LABEL: Record<string, string> = {
  level_1: "Level 1 — Membership",
  level_2: "Level 2 — Plus",
  level_3: "Level 3 — Coaching Circle",
  level_4: "Level 4 — Executive Coaching",
};

const TIER_STYLE: Record<string, string> = {
  level_1: "bg-muted text-muted-foreground",
  level_2: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  level_3:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  level_4:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

// Events that meaningfully relate to a piece of content
const CONTENT_EVENT_TYPES = new Set([
  "daily_listened",
  "daily_started",
  "weekly_viewed",
  "monthly_viewed",
  "note_created",
  "note_updated",
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
  journal_opened: "Journal opened",
  event_attended: "Event attended",
  qa_submitted: "Question submitted",
  qa_viewed: "Q&A viewed",
  milestone_reached: "Streak milestone reached",
  upgrade_prompt_seen: "Upgrade prompt seen",
  upgrade_clicked: "Upgrade clicked",
};

const EVENT_DOT_STYLE: Record<string, string> = {
  daily_listened: "bg-green-500",
  daily_started: "bg-green-300",
  weekly_viewed: "bg-blue-400",
  monthly_viewed: "bg-amber-400",
  note_created: "bg-violet-400",
  note_updated: "bg-violet-300",
  milestone_reached: "bg-yellow-400",
  default: "bg-muted-foreground",
};

function getEventDotStyle(type: string): string {
  return EVENT_DOT_STYLE[type] ?? EVENT_DOT_STYLE.default;
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
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  muted,
}: {
  label: string;
  value: string | number;
  sub?: string;
  muted?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 text-center">
      <div
        className={`font-heading font-bold text-xl tabular-nums ${
          muted ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      )}
      <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">
        {label}
      </div>
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

  // Stripe dashboard deep-link (read-only external reference)
  const stripeUrl = member.stripe_customer_id
    ? `https://dashboard.stripe.com/customers/${member.stripe_customer_id}`
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back nav */}
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        ← All members
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em]"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {member.name ?? member.email}
          </h1>
          {member.name && (
            <p className="text-muted-foreground text-sm mt-0.5">
              {member.email}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
              STATUS_STYLE[member.subscription_status] ?? STATUS_STYLE.inactive
            }`}
          >
            {STATUS_LABEL[member.subscription_status] ??
              member.subscription_status}
          </span>

          {member.subscription_tier && (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                TIER_STYLE[member.subscription_tier] ??
                "bg-muted text-muted-foreground"
              }`}
            >
              {TIER_LABEL[member.subscription_tier] ??
                member.subscription_tier}
            </span>
          )}
        </div>
      </div>

      {/* ── At-a-glance stats ─────────────────────────────────────────── */}
      {/* Four cards: the most support-relevant numbers, immediately visible */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Practice Streak"
          value={member.practice_streak}
          sub={member.practice_streak === 1 ? "day" : "days"}
          muted={member.practice_streak === 0}
        />
        <StatCard label="Completed Listens" value={stats.listenCount} />
        <StatCard label="Journal Entries" value={stats.journalCount} />
        <StatCard
          label="Last Active"
          value={formatRelativeDate(member.last_practiced_at)}
          muted={!member.last_practiced_at}
        />
      </div>

      {/* ── Profile ───────────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-semibold text-sm text-foreground mb-4">Profile</h2>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          {/* Most useful support fields first */}
          <ProfileField label="Email">{member.email}</ProfileField>

          <ProfileField label="Name">
            {member.name ?? (
              <span className="text-muted-foreground">Not set</span>
            )}
          </ProfileField>

          <ProfileField label="Member Since">
            {formatDate(member.created_at)}
          </ProfileField>

          <ProfileField label="Timezone">{member.timezone || "—"}</ProfileField>

          <ProfileField label="Password Set">
            {member.password_set ? "Yes" : "No — magic link only"}
          </ProfileField>

          {member.subscription_end_date ? (
            <ProfileField label="Subscription End">
              <span className="text-amber-600 font-medium">
                {formatDate(member.subscription_end_date)}
              </span>
            </ProfileField>
          ) : (
            <ProfileField label="Subscription End">
              <span className="text-muted-foreground">Ongoing</span>
            </ProfileField>
          )}

          {/* Stripe — key admin action surface */}
          <ProfileField label="Stripe Customer">
            {stripeUrl ? (
              <a
                href={stripeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover transition-colors font-mono text-xs"
              >
                {member.stripe_customer_id} ↗
              </a>
            ) : (
              <span className="text-muted-foreground">Not linked</span>
            )}
          </ProfileField>

          {/* ID — technical reference, shown last */}
          <ProfileField label="Member ID">
            <span className="font-mono text-xs text-muted-foreground">
              {member.id}
            </span>
          </ProfileField>
        </dl>
      </section>

      {/* ── Billing note ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 bg-muted/40 border border-border rounded-lg px-4 py-3 text-xs text-muted-foreground">
        <span className="mt-0.5 text-base leading-none flex-shrink-0">ℹ</span>
        <span>
          Billing is managed exclusively in Stripe. To change a subscription,
          issue a refund, or cancel, use the{" "}
          {stripeUrl ? (
            <a
              href={stripeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-foreground hover:text-primary transition-colors"
            >
              Stripe Dashboard ↗
            </a>
          ) : (
            "Stripe Dashboard"
          )}
          .
        </span>
      </div>

      {/* ── Recent activity timeline ──────────────────────────────────── */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-semibold text-sm text-foreground mb-4">
          Recent Activity
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            Last {activity.length} events
          </span>
        </h2>

        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No activity recorded yet.
          </p>
        ) : (
          <ol className="space-y-0 relative">
            {/* Vertical connecting line */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />

            {activity.map((event) => {
              // Resolve content title when available and relevant
              const contentTitle =
                event.content_id &&
                CONTENT_EVENT_TYPES.has(event.event_type)
                  ? contentTitleMap.get(event.content_id)
                  : undefined;

              return (
                <li
                  key={event.id}
                  className="relative flex gap-3 pl-5 pb-4 last:pb-0"
                >
                  {/* Dot */}
                  <span
                    className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-card ${getEventDotStyle(
                      event.event_type
                    )}`}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      {EVENT_LABEL[event.event_type] ?? event.event_type}
                    </p>
                    {/* Content title — shown when resolved, clipped to one line */}
                    {contentTitle && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {contentTitle}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      {formatDateTime(event.occurred_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
