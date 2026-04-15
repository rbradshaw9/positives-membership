import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getAdminAssignableMembers,
  getAdminRolesForMember,
  getAvailableAdminRoles,
  getMemberCrmDetail,
} from "@/lib/admin/member-crm";
import { getContentTitleMap } from "@/lib/queries/get-admin-members";
import { PLAN_NAME_BY_TIER } from "@/lib/plans";
import {
  getAdminPlanChangeOptions,
  getAdminPlanChangePreview,
} from "@/server/services/stripe/admin-plan-change";
import {
  addMemberAdminNote,
  addMemberDocumentReference,
  applyMemberPlanChange,
  assignAdminRoleToMember,
  adjustMemberPoints,
  grantCourseToMember,
  previewMemberPlanChange,
  removeAdminRoleFromMember,
  revokeCourseEntitlement,
  unlockCourseWithPointsForMember,
  updateMemberCrmProfile,
} from "./actions";

export const metadata = {
  title: "Member Management — Positives Admin",
};

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

const SOURCE_LABEL: Record<string, string> = {
  purchase: "Purchase",
  migration: "Migration",
  admin_grant: "Admin grant",
  points_unlock: "Points unlock",
  gift: "Gift",
};

const FOLLOWUP_LABEL: Record<string, string> = {
  none: "No follow-up",
  needs_followup: "Needs follow-up",
  waiting_on_member: "Waiting on member",
  resolved: "Resolved",
};

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
  event_joined: "Event joined",
  qa_submitted: "Question submitted",
  qa_viewed: "Q&A viewed",
  milestone_reached: "Streak milestone reached",
  upgrade_prompt_seen: "Upgrade prompt seen",
  upgrade_clicked: "Upgrade clicked",
  course_lesson_completed: "Course lesson completed",
  course_completed: "Course completed",
  community_post_created: "Community post created",
  community_reply_created: "Community reply created",
  course_unlocked: "Course unlocked",
  admin_course_granted: "Course granted",
  admin_course_revoked: "Course revoked",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "Never";
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function asFormAction(action: (formData: FormData) => Promise<unknown>) {
  return action as unknown as (formData: FormData) => Promise<void>;
}

function isCoachOnlyRoleSet(roles: { role_key: string }[]) {
  const keys = new Set(roles.map((role) => role.role_key));
  return (
    keys.has("coach") &&
    !keys.has("super_admin") &&
    !keys.has("admin") &&
    !keys.has("support") &&
    !keys.has("readonly")
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="member-crm-section">
      <div className="member-crm-section__header">
        <div>
          <h2 className="member-crm-section__title">{title}</h2>
          {description ? (
            <p className="member-crm-section__description">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="member-crm-section__body">{children}</div>
    </section>
  );
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="member-crm-profile-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={["admin-input", className].filter(Boolean).join(" ")} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={["admin-textarea", className].filter(Boolean).join(" ")} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return <select {...rest} className={["admin-select", className].filter(Boolean).join(" ")} />;
}

function getInitials(name: string | null, email: string) {
  const source = name?.trim() || email.split("@")[0] || "Member";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="member-crm-pill">{children}</span>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="member-crm-empty">{children}</div>;
}

function ClientAuthorizationFields({
  reasonName,
  reasonLabel = "Change reason",
  reasonPlaceholder = "Who authorized this, and why are we making the change?",
}: {
  reasonName: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
}) {
  return (
    <div className="member-crm-authorization">
      <label className="member-crm-checkbox-row">
        <input type="checkbox" name="clientAuthorizationConfirmed" required />
        <span>
          I verified this change is authorized by the member/client or approved by the team.
        </span>
      </label>
      <label className="admin-form-field">
        <span className="admin-search-bar__label">{reasonLabel}</span>
        <TextArea name={reasonName} required placeholder={reasonPlaceholder} />
      </label>
    </div>
  );
}

function ClientAuthorizationCheckbox() {
  return (
    <label className="member-crm-checkbox-row">
      <input type="checkbox" name="clientAuthorizationConfirmed" required />
      <span>
        I verified this change is authorized by the member/client or approved by the team.
      </span>
    </label>
  );
}

function MemberCrmStyles() {
  return (
    <style>{`
      .member-crm-shell {
        width: min(100%, 76rem);
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .member-crm-hero {
        position: relative;
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--color-primary) 18%, var(--color-border));
        border-radius: 1.75rem;
        background:
          radial-gradient(circle at 16% 18%, rgba(46, 196, 182, 0.22), transparent 34%),
          radial-gradient(circle at 82% 18%, rgba(68, 168, 216, 0.18), transparent 30%),
          linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.92));
        box-shadow: 0 24px 70px rgba(14, 16, 21, 0.09);
        padding: clamp(1rem, 2vw, 1.5rem);
      }

      .member-crm-hero::after {
        content: "";
        position: absolute;
        inset: auto -8rem -12rem auto;
        width: 24rem;
        height: 24rem;
        border-radius: 999px;
        background: rgba(255, 224, 102, 0.22);
        pointer-events: none;
      }

      .member-crm-hero__inner {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.38fr);
        gap: 1rem;
        align-items: stretch;
      }

      .member-crm-identity {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        min-width: 0;
      }

      .member-crm-avatar {
        width: 4.25rem;
        height: 4.25rem;
        flex: 0 0 auto;
        border-radius: 1.25rem;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #0E1015, #243140);
        color: white;
        font-family: var(--font-heading);
        font-size: 1.25rem;
        font-weight: 800;
        letter-spacing: -0.04em;
        box-shadow: 0 18px 40px rgba(14, 16, 21, 0.22);
      }

      .member-crm-avatar--photo {
        background-position: center;
        background-size: cover;
        color: transparent;
      }

      .member-crm-eyebrow {
        margin: 0 0 0.35rem;
        font-size: 0.6875rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--color-primary);
      }

      .member-crm-title {
        margin: 0;
        max-width: 44rem;
        color: var(--color-foreground);
        font-family: var(--font-heading);
        font-size: clamp(2rem, 1.35rem + 2.2vw, 3.35rem);
        font-weight: 800;
        letter-spacing: -0.055em;
        line-height: 0.96;
        text-wrap: balance;
      }

      .member-crm-email {
        margin: 0.7rem 0 0;
        color: var(--color-muted-fg);
        font-size: 0.9rem;
      }

      .member-crm-badge-row,
      .member-crm-quick-links {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
      }

      .member-crm-badge-row {
        margin-top: 1rem;
      }

      .member-crm-hero-panel {
        border: 1px solid rgba(255, 255, 255, 0.72);
        border-radius: 1.25rem;
        background: rgba(255, 255, 255, 0.72);
        box-shadow: 0 16px 40px rgba(14, 16, 21, 0.07);
        backdrop-filter: blur(14px);
        padding: 1rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 1rem;
      }

      .member-crm-hero-panel__label,
      .member-crm-profile-field dt {
        color: var(--color-muted-fg);
        font-size: 0.6875rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .member-crm-hero-panel__value {
        margin-top: 0.25rem;
        font-family: var(--font-heading);
        font-size: 1.35rem;
        font-weight: 800;
        letter-spacing: -0.04em;
      }

      .member-crm-nav {
        position: sticky;
        top: 1rem;
        z-index: 8;
        display: flex;
        gap: 0.45rem;
        overflow-x: auto;
        padding: 0.55rem;
        border: 1px solid rgba(255, 255, 255, 0.7);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.84);
        box-shadow: 0 18px 45px rgba(14, 16, 21, 0.08);
        backdrop-filter: blur(16px);
      }

      .member-crm-nav a {
        flex: 0 0 auto;
        border-radius: 999px;
        padding: 0.48rem 0.75rem;
        color: var(--color-muted-fg);
        font-size: 0.75rem;
        font-weight: 750;
        text-decoration: none;
        transition: background 140ms ease, color 140ms ease, transform 140ms ease;
      }

      .member-crm-nav a:hover {
        background: rgba(46, 196, 182, 0.1);
        color: var(--color-foreground);
        transform: translateY(-1px);
      }

      .member-crm-metrics {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 0.75rem;
      }

      .member-crm-metric {
        min-height: 7.25rem;
        border: 1px solid rgba(255, 255, 255, 0.74);
        border-radius: 1.25rem;
        background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.78));
        box-shadow: 0 16px 36px rgba(14, 16, 21, 0.055);
        padding: 1rem;
      }

      .member-crm-metric__value {
        font-family: var(--font-heading);
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: -0.05em;
        line-height: 1;
      }

      .member-crm-metric__label {
        margin-top: 0.5rem;
        color: var(--color-muted-fg);
        font-size: 0.6875rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .member-crm-metric__hint {
        margin-top: 0.45rem;
        color: var(--color-muted-fg);
        font-size: 0.75rem;
        line-height: 1.35;
      }

      .member-crm-section {
        scroll-margin-top: 5.5rem;
        overflow: hidden;
        border: 1px solid rgba(226, 232, 240, 0.92);
        border-radius: 1.35rem;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 16px 42px rgba(14, 16, 21, 0.055);
      }

      .member-crm-section__header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.1rem 1.25rem;
        border-bottom: 1px solid rgba(226, 232, 240, 0.85);
        background: linear-gradient(180deg, rgba(248,250,252,0.9), rgba(255,255,255,0.72));
      }

      .member-crm-section__title {
        margin: 0;
        font-family: var(--font-heading);
        font-size: 1.05rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        text-wrap: balance;
      }

      .member-crm-section__description {
        margin: 0.28rem 0 0;
        color: var(--color-muted-fg);
        font-size: 0.8rem;
        line-height: 1.45;
      }

      .member-crm-section__body {
        padding: 1.25rem;
      }

      .member-crm-grid-2 {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(18rem, 0.75fr);
        gap: 1rem;
      }

      .member-crm-card {
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 1rem;
        background: linear-gradient(180deg, #fff, rgba(248,250,252,0.78));
        box-shadow: 0 10px 28px rgba(14, 16, 21, 0.04);
        padding: 1rem;
      }

      .member-crm-card-title {
        margin: 0 0 0.75rem;
        font-weight: 800;
        letter-spacing: -0.02em;
      }

      .member-crm-card-title--row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .member-crm-form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
        gap: 1rem;
      }

      .member-crm-readonly-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
        gap: 1rem;
        grid-column: 1 / -1;
      }

      .member-crm-readonly-field {
        border: 1px solid var(--color-border);
        border-radius: 1rem;
        background: color-mix(in srgb, var(--color-surface) 88%, white);
        padding: 0.9rem 1rem;
      }

      .member-crm-readonly-field__value {
        margin: 0.35rem 0 0;
        color: var(--color-fg);
        font-family: var(--font-heading);
        font-size: 1rem;
        font-weight: 750;
      }

      .member-crm-warning-note {
        grid-column: 1 / -1;
        border: 1px solid color-mix(in srgb, #f59e0b 38%, var(--color-border));
        border-radius: 1rem;
        background: color-mix(in srgb, #fef3c7 62%, var(--color-surface));
        color: #6b4e16;
        font-size: 0.85rem;
        line-height: 1.55;
        padding: 0.9rem 1rem;
      }

      .member-crm-authorization {
        display: grid;
        gap: 0.75rem;
        margin-top: 0.75rem;
      }

      .member-crm-checkbox-row {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        color: var(--color-muted-fg);
        font-size: 0.8125rem;
        line-height: 1.5;
      }

      .member-crm-checkbox-row input {
        margin-top: 0.15rem;
      }

      .member-crm-profile-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
        gap: 1.15rem 2rem;
      }

      .member-crm-profile-field {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }

      .member-crm-profile-field dd {
        margin: 0;
        color: var(--color-foreground);
        font-size: 0.9rem;
        line-height: 1.45;
      }

      .member-crm-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .member-crm-record {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        border: 1px solid rgba(226, 232, 240, 0.85);
        border-radius: 1rem;
        background: white;
        padding: 1rem;
        box-shadow: 0 10px 24px rgba(14, 16, 21, 0.035);
      }

      .member-crm-record__title {
        margin: 0;
        font-weight: 800;
        letter-spacing: -0.02em;
      }

      .member-crm-record__meta,
      .member-crm-record__note {
        margin: 0.35rem 0 0;
        color: var(--color-muted-fg);
        font-size: 0.78rem;
        line-height: 1.5;
      }

      .member-crm-record__note {
        font-size: 0.82rem;
      }

      .member-crm-timeline {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
      }

      .member-crm-timeline-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 0.75rem;
        align-items: flex-start;
        border: 1px solid rgba(226, 232, 240, 0.84);
        border-radius: 0.95rem;
        background: white;
        padding: 0.85rem 1rem;
      }

      .member-crm-timeline-dot {
        width: 0.75rem;
        height: 0.75rem;
        margin-top: 0.25rem;
        border-radius: 999px;
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        box-shadow: 0 0 0 4px rgba(46, 196, 182, 0.12);
      }

      .member-crm-pill {
        display: inline-flex;
        align-items: center;
        border: 1px solid rgba(226, 232, 240, 0.92);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.76);
        color: var(--color-muted-fg);
        padding: 0.26rem 0.62rem;
        font-size: 0.72rem;
        font-weight: 750;
      }

      .member-crm-empty {
        border: 1px dashed rgba(148, 163, 184, 0.55);
        border-radius: 1rem;
        background: rgba(248, 250, 252, 0.75);
        color: var(--color-muted-fg);
        padding: 1rem;
        font-size: 0.9rem;
      }

      .member-crm-muted {
        color: var(--color-muted-fg);
        font-size: 0.82rem;
        line-height: 1.5;
      }

      .member-crm-mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 0.74rem;
      }

      .member-crm-link {
        color: var(--color-primary);
        font-size: 0.8125rem;
        font-weight: 750;
        text-decoration: none;
      }

      .member-crm-link:hover {
        text-decoration: underline;
      }

      @media (max-width: 1100px) {
        .member-crm-hero__inner,
        .member-crm-grid-2 {
          grid-template-columns: 1fr;
        }

        .member-crm-metrics {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 700px) {
        .member-crm-hero {
          border-radius: 1.25rem;
        }

        .member-crm-identity,
        .member-crm-record {
          flex-direction: column;
        }

        .member-crm-avatar {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 1rem;
        }

        .member-crm-nav {
          top: 0.5rem;
          border-radius: 1rem;
        }

        .member-crm-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .member-crm-section__body,
        .member-crm-section__header {
          padding: 1rem;
        }
      }
    `}</style>
  );
}

type PageParams = Promise<{ id: string }>;
type SearchParams = Promise<{ success?: string; planTarget?: string }>;

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const adminUser = await requireAdmin();

  const { id } = await params;
  const sp = await searchParams;
  const [detail, coaches, availableRoles, currentAdminRoles] = await Promise.all([
    getMemberCrmDetail(id),
    getAdminAssignableMembers(),
    getAvailableAdminRoles(),
    getAdminRolesForMember(adminUser.id),
  ]);

  if (!detail) notFound();
  if (
    isCoachOnlyRoleSet(currentAdminRoles) &&
    detail.member.assigned_coach_id !== adminUser.id
  ) {
    notFound();
  }

  const {
    member,
    entitlements,
    grantableCourses,
    pointBalance,
    points,
    notes,
    documents,
    overrides,
    audit,
    activity,
    stats,
    roles,
  } = detail;

  const contentTitleMap = await getContentTitleMap(activity.map((event) => event.content_id));
  const stripeUrl = member.stripe_customer_id
    ? `https://dashboard.stripe.com/customers/${member.stripe_customer_id}`
    : null;
  const planChangeOptions = getAdminPlanChangeOptions();
  const planChangePreview = sp.planTarget
    ? await getAdminPlanChangePreview({
        stripeCustomerId: member.stripe_customer_id,
        targetKey: sp.planTarget,
      })
    : null;
  const activeEntitlements = entitlements.filter((entitlement) => entitlement.status === "active");
  const inactiveEntitlements = entitlements.filter((entitlement) => entitlement.status !== "active");
  const isSubscriber = member.subscription_status === "active" || member.subscription_status === "trialing";
  const accessType = isSubscriber
    ? "Subscriber"
    : activeEntitlements.length > 0
      ? "Course-only"
      : "No active access";
  const lastSeen = member.last_seen_at ?? member.last_practiced_at;
  const displayName = member.name ?? member.email;

  return (
    <div className="member-crm-shell">
      <MemberCrmStyles />
      <Link href="/admin/members" className="admin-back-link">
        ← Member directory
      </Link>

      {sp.success ? (
        <div className="admin-banner admin-banner--success">
          {sp.success.replaceAll("_", " ")}
        </div>
      ) : null}

      <section className="member-crm-hero">
        <div className="member-crm-hero__inner">
          <div className="member-crm-identity">
            <div
              className={[
                "member-crm-avatar",
                member.avatar_url ? "member-crm-avatar--photo" : "",
              ].filter(Boolean).join(" ")}
              style={member.avatar_url ? { backgroundImage: `url(${member.avatar_url})` } : undefined}
              aria-hidden="true"
            >
              {getInitials(member.name, member.email)}
            </div>
            <div>
              <p className="member-crm-eyebrow">Member Management</p>
              <h1 className="member-crm-title">{displayName}</h1>
              <p className="member-crm-email">{member.email}</p>
              <div className="member-crm-badge-row">
                <span className={STATUS_BADGE[member.subscription_status] ?? STATUS_BADGE.inactive}>
                  {STATUS_LABEL[member.subscription_status] ?? member.subscription_status}
                </span>
                {member.subscription_tier ? (
                  <span className={TIER_BADGE[member.subscription_tier] ?? "admin-badge admin-badge--l1"}>
                    {PLAN_NAME_BY_TIER[member.subscription_tier as keyof typeof PLAN_NAME_BY_TIER] ?? member.subscription_tier}
                  </span>
                ) : null}
                <span className={activeEntitlements.length > 0 ? "admin-badge admin-badge--review" : "admin-badge admin-badge--inactive"}>
                  {accessType}
                </span>
                <Pill>{FOLLOWUP_LABEL[member.followup_status] ?? member.followup_status}</Pill>
              </div>
            </div>
          </div>

          <aside className="member-crm-hero-panel" aria-label="Member quick context">
            <div>
              <p className="member-crm-hero-panel__label">Last Seen</p>
              <p className="member-crm-hero-panel__value">{formatRelativeDate(lastSeen)}</p>
              <p className="member-crm-muted">{formatDateTime(lastSeen)}</p>
            </div>
            <div className="member-crm-quick-links">
              {stripeUrl ? (
                <a className="admin-btn admin-btn--outline" href={stripeUrl} target="_blank" rel="noopener noreferrer">
                  Stripe
                </a>
              ) : null}
              <a className="admin-btn admin-btn--outline" href="#courses">
                Manage courses
              </a>
              <a className="admin-btn admin-btn--primary" href="#notes">
                Add note
              </a>
            </div>
          </aside>
        </div>
      </section>

      <nav
        aria-label="Member management sections"
        className="member-crm-nav"
      >
        {[
          ["overview", "Overview"],
          ["access", "Access"],
          ["courses", "Courses"],
          ["points", "Points"],
          ["activity", "Activity"],
          ["billing", "Billing"],
          ["communication", "Communication"],
          ["notes", "Notes"],
          ["documents", "Documents"],
          ["audit", "Audit"],
        ].map(([href, label]) => (
          <a key={href} href={`#${href}`}>
            {label}
          </a>
        ))}
      </nav>

      <div className="member-crm-metrics" aria-label="Member summary metrics">
        {[
          ["Access", accessType, isSubscriber ? "Membership access is active." : activeEntitlements.length > 0 ? "Permanent course access remains." : "No protected access right now."],
          ["Courses", String(activeEntitlements.length), `${inactiveEntitlements.length} inactive history item${inactiveEntitlements.length === 1 ? "" : "s"}.`],
          ["Points", String(pointBalance), "Available unlock balance."],
          ["Last Seen", formatRelativeDate(lastSeen), member.last_practiced_at ? `Last practice ${formatRelativeDate(member.last_practiced_at)}.` : "No practice tracked yet."],
          ["Listens", String(stats.listenCount), "Completed audio events."],
          ["Journal", String(stats.journalCount), "Reflection activity."],
        ].map(([label, value, hint]) => (
          <div key={label} className="member-crm-metric">
            <div className="member-crm-metric__value">{value}</div>
            <div className="member-crm-metric__label">{label}</div>
            <p className="member-crm-metric__hint">{hint}</p>
          </div>
        ))}
      </div>

      <Section id="overview" title="Overview" description="Fast support context for this member.">
        <dl className="member-crm-profile-grid">
          <ProfileField label="Email">{member.email}</ProfileField>
          <ProfileField label="Name">{member.name ?? "Not set"}</ProfileField>
          <ProfileField label="Member Since">{formatDate(member.created_at)}</ProfileField>
          <ProfileField label="First Login">{formatDateTime(member.first_login_at)}</ProfileField>
          <ProfileField label="Last Seen">{formatDateTime(lastSeen)}</ProfileField>
          <ProfileField label="Follow-up">
            {FOLLOWUP_LABEL[member.followup_status] ?? member.followup_status}
          </ProfileField>
          <ProfileField label="Assigned Coach">
            {coaches.find((coach) => coach.id === member.assigned_coach_id)?.label ?? "Unassigned"}
          </ProfileField>
          <ProfileField label="Legacy Ref">{member.legacy_member_ref ?? "—"}</ProfileField>
        </dl>
      </Section>

      <Section id="access" title="Access" description="Operational member fields and access context. Billing/tier changes must go through Stripe-backed plan-change tooling.">
        <form action={asFormAction(updateMemberCrmProfile)} className="member-crm-form-grid">
          <input type="hidden" name="memberId" value={member.id} />
          <div className="member-crm-warning-note">
            <strong>Stripe is the source of truth for billing and subscription tier.</strong>{" "}
            This page no longer saves direct status/tier edits because that would not update the
            member&apos;s invoice or subscription. A proper admin plan-change flow should preview
            upgrade prorations, show the immediate charge, and explain that downgrades take effect
            on the next billing date before anything is applied.
          </div>
          <div className="member-crm-readonly-grid" aria-label="Stripe billing state">
            <div className="member-crm-readonly-field">
              <span className="admin-search-bar__label">Subscription Status</span>
              <p className="member-crm-readonly-field__value">
                {STATUS_LABEL[member.subscription_status] ?? member.subscription_status}
              </p>
            </div>
            <div className="member-crm-readonly-field">
              <span className="admin-search-bar__label">Tier</span>
              <p className="member-crm-readonly-field__value">
                {member.subscription_tier
                  ? PLAN_NAME_BY_TIER[member.subscription_tier] ?? member.subscription_tier
                  : "No tier"}
              </p>
            </div>
          </div>
          <label className="admin-form-field">
            <span className="admin-search-bar__label">Name</span>
            <TextInput name="name" defaultValue={member.name ?? ""} />
          </label>
          <label className="admin-form-field">
            <span className="admin-search-bar__label">Timezone</span>
            <TextInput name="timezone" defaultValue={member.timezone ?? "America/New_York"} />
          </label>
          <label className="admin-form-field">
            <span className="admin-search-bar__label">Assigned Coach</span>
            <Select name="assignedCoachId" defaultValue={member.assigned_coach_id ?? ""}>
              <option value="">Unassigned</option>
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.id}>{coach.label}</option>
              ))}
            </Select>
          </label>
          <label className="admin-form-field">
            <span className="admin-search-bar__label">Follow-up Status</span>
            <Select name="followupStatus" defaultValue={member.followup_status ?? "none"}>
              <option value="none">No follow-up</option>
              <option value="needs_followup">Needs follow-up</option>
              <option value="waiting_on_member">Waiting on member</option>
              <option value="resolved">Resolved</option>
            </Select>
          </label>
          <label className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
            <span className="admin-search-bar__label">Follow-up Note</span>
            <TextArea name="followupNote" defaultValue={member.followup_note ?? ""} />
            <span className="member-crm-muted">
              Use this for the current next action. Use Notes below for dated history and coaching/support context.
            </span>
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <ClientAuthorizationFields reasonName="changeReason" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="admin-btn admin-btn--primary">
              Save member management fields
            </button>
          </div>
        </form>

        {overrides.length > 0 ? (
          <div style={{ marginTop: "1rem" }}>
            <p className="admin-search-bar__label">Manual access overrides</p>
            <div className="member-crm-list" style={{ marginTop: "0.6rem" }}>
              {overrides.map((override) => (
                <div key={override.id} className="member-crm-card">
                  <p className="member-crm-record__title">{override.active ? "Active" : "Inactive"} override</p>
                  <p className="member-crm-record__meta">
                    {override.reason} · {formatDate(override.starts_at)}
                    {override.ends_at ? ` through ${formatDate(override.ends_at)}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Section>

      <Section id="courses" title="Courses" description="Permanent ownership, grants, revokes, and point unlocks.">
        <div className="member-crm-grid-2">
          <div className="member-crm-list">
            {activeEntitlements.length > 0 ? (
              activeEntitlements.map((entitlement) => (
                <div key={entitlement.id} className="member-crm-record">
                  <div style={{ minWidth: 0 }}>
                    <div>
                      <p className="member-crm-record__title">{entitlement.course?.title ?? "Unknown course"}</p>
                      <p className="member-crm-record__meta">
                        {SOURCE_LABEL[entitlement.source] ?? entitlement.source} · Granted {formatDate(entitlement.granted_at)}
                        {entitlement.legacy_ref ? ` · Legacy ${entitlement.legacy_ref}` : ""}
                      </p>
                      {entitlement.grant_note ? (
                        <p className="member-crm-record__note">
                          {entitlement.grant_note}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <form action={asFormAction(revokeCourseEntitlement)} style={{ minWidth: "14rem" }}>
                    <input type="hidden" name="memberId" value={member.id} />
                    <input type="hidden" name="entitlementId" value={entitlement.id} />
                    <TextInput name="revokeNote" required placeholder="Reason to revoke..." />
                    <div style={{ marginTop: "0.5rem" }}>
                      <ClientAuthorizationCheckbox />
                    </div>
                    <button type="submit" className="admin-btn admin-btn--outline" style={{ marginTop: "0.5rem" }}>
                      Revoke access
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <EmptyState>No active course entitlements yet.</EmptyState>
            )}

            {inactiveEntitlements.length > 0 ? (
              <details className="member-crm-card">
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                  Inactive entitlement history ({inactiveEntitlements.length})
                </summary>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }}>
                  {inactiveEntitlements.map((entitlement) => (
                    <div key={entitlement.id} style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)" }}>
                      <strong>{entitlement.course?.title ?? "Unknown course"}</strong> · {entitlement.status}
                      {entitlement.revoke_note ? ` · ${entitlement.revoke_note}` : ""}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>

          <div className="member-crm-list">
            <form action={asFormAction(grantCourseToMember)} className="member-crm-card">
              <input type="hidden" name="memberId" value={member.id} />
              <p className="member-crm-card-title">Grant course</p>
              <label className="admin-form-field">
                <span className="admin-search-bar__label">Course</span>
                <Select name="courseId" required>
                  <option value="">Choose course...</option>
                  {grantableCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} ({course.status})
                    </option>
                  ))}
                </Select>
              </label>
              <label className="admin-form-field" style={{ marginTop: "0.75rem" }}>
                <span className="admin-search-bar__label">Grant reason</span>
                <TextArea name="grantNote" required placeholder="Coach bonus, migration correction, support fix..." />
              </label>
              <ClientAuthorizationCheckbox />
              <button type="submit" className="admin-btn admin-btn--primary" style={{ marginTop: "0.75rem" }}>
                Grant access
              </button>
            </form>

            <form action={asFormAction(unlockCourseWithPointsForMember)} className="member-crm-card">
              <input type="hidden" name="memberId" value={member.id} />
              <p className="member-crm-card-title" style={{ marginBottom: "0.35rem" }}>Unlock with points</p>
              <p className="member-crm-muted" style={{ marginBottom: "0.75rem" }}>
                Current balance: {pointBalance} points
              </p>
              <label className="admin-form-field">
                <span className="admin-search-bar__label">Course</span>
                <Select name="courseId" required>
                  <option value="">Choose course...</option>
                  {grantableCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} · {course.points_price ?? Math.round((course.price_cents ?? 0) / 100)} pts
                    </option>
                  ))}
                </Select>
              </label>
              <label className="admin-form-field" style={{ marginTop: "0.75rem" }}>
                <span className="admin-search-bar__label">Point cost</span>
                <TextInput name="pointsCost" type="number" min="1" required placeholder="97" />
              </label>
              <label className="admin-form-field" style={{ marginTop: "0.75rem" }}>
                <span className="admin-search-bar__label">Note</span>
                <TextInput name="note" required placeholder="Course unlocked with points" />
              </label>
              <ClientAuthorizationCheckbox />
              <button type="submit" className="admin-btn admin-btn--outline" style={{ marginTop: "0.75rem" }}>
                Unlock course
              </button>
            </form>
          </div>
        </div>
      </Section>

      <Section id="points" title="Points" description="Immutable ledger for engagement rewards and course unlocks.">
        <div className="member-crm-grid-2">
          <div className="member-crm-card">
            <p className="member-crm-card-title">Recent ledger</p>
            {points.length > 0 ? (
              <div className="member-crm-list">
                {points.map((entry) => (
                  <div key={entry.id} className="member-crm-record" style={{ alignItems: "center" }}>
                    <div>
                      <p className="member-crm-record__title">{entry.description ?? entry.reason.replaceAll("_", " ")}</p>
                      <p className="member-crm-record__meta">
                        {formatDateTime(entry.created_at)}
                        {entry.course?.title ? ` · ${entry.course.title}` : ""}
                      </p>
                    </div>
                    <span style={{ fontWeight: 800, color: entry.delta > 0 ? "var(--color-primary)" : "#b45309" }}>
                      {entry.delta > 0 ? "+" : ""}{entry.delta}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No points activity yet.</EmptyState>
            )}
          </div>
          <form action={asFormAction(adjustMemberPoints)} className="member-crm-card">
            <input type="hidden" name="memberId" value={member.id} />
            <p className="member-crm-card-title" style={{ marginBottom: "0.35rem" }}>Adjust points</p>
            <p className="member-crm-muted" style={{ marginBottom: "0.75rem" }}>
              Balance: {pointBalance}
            </p>
            <label className="admin-form-field">
              <span className="admin-search-bar__label">Delta</span>
              <TextInput name="delta" type="number" required placeholder="+25 or -10" />
            </label>
            <label className="admin-form-field" style={{ marginTop: "0.75rem" }}>
              <span className="admin-search-bar__label">Reason</span>
              <TextArea name="description" required placeholder="Manual correction, bonus, event attendance..." />
            </label>
            <ClientAuthorizationCheckbox />
            <button type="submit" className="admin-btn admin-btn--primary" style={{ marginTop: "0.75rem" }}>
              Save point adjustment
            </button>
          </form>
        </div>
      </Section>

      <Section id="activity" title="Activity" description="Recent product activity and lifecycle signals.">
        {activity.length > 0 ? (
          <div className="member-crm-timeline">
            {activity.map((event) => (
              <div key={event.id} className="member-crm-timeline-item">
                <span className="member-crm-timeline-dot" aria-hidden="true" />
                <div>
                  <p className="member-crm-record__title">
                    {EVENT_LABEL[event.event_type] ?? event.event_type}
                  </p>
                  <p className="member-crm-record__meta">
                    {formatDateTime(event.occurred_at)}
                    {event.content_id && contentTitleMap.get(event.content_id)
                      ? ` · ${contentTitleMap.get(event.content_id)}`
                      : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>No activity yet.</EmptyState>
        )}
      </Section>

      <Section id="billing" title="Billing" description="Billing remains Stripe-authoritative; admin shows operational context and links.">
        <dl className="member-crm-profile-grid">
          <ProfileField label="Stripe Customer">
            {stripeUrl ? (
              <a href={stripeUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)" }} className="member-crm-mono">
                {member.stripe_customer_id} ↗
              </a>
            ) : "Not linked"}
          </ProfileField>
          <ProfileField label="Subscription End">
            {member.subscription_end_date ? formatDate(member.subscription_end_date) : "Ongoing / not set"}
          </ProfileField>
          <ProfileField label="Billing Edit Policy">
            Use Stripe for invoice/payment-method changes; use admin fields only for operational corrections.
          </ProfileField>
        </dl>
        <div className="member-crm-grid-2" style={{ marginTop: "1.25rem" }}>
          <form action={asFormAction(previewMemberPlanChange)} className="member-crm-card">
            <input type="hidden" name="memberId" value={member.id} />
            <p className="member-crm-card-title">Preview admin plan change</p>
            <p className="member-crm-muted" style={{ marginBottom: "0.75rem" }}>
              This only previews the Stripe impact. The change is not applied until the confirmation
              step below is submitted.
            </p>
            <label className="admin-form-field">
              <span className="admin-search-bar__label">Target plan</span>
              <Select name="targetKey" defaultValue={sp.planTarget ?? ""} required>
                <option value="">Choose target plan...</option>
                {planChangeOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
            {planChangeOptions.length === 0 ? (
              <p className="member-crm-record__note">
                No plan-change prices are configured in this environment.
              </p>
            ) : null}
            <button type="submit" className="admin-btn admin-btn--outline" style={{ marginTop: "0.75rem" }}>
              Preview Stripe impact
            </button>
          </form>

          <div className="member-crm-card">
            <p className="member-crm-card-title">Stripe impact</p>
            {!planChangePreview ? (
              <EmptyState>Choose a target plan to preview the billing impact.</EmptyState>
            ) : !planChangePreview.ok ? (
              <EmptyState>{planChangePreview.error}</EmptyState>
            ) : (
              <div className="member-crm-list">
                <dl className="member-crm-profile-grid">
                  <ProfileField label="Current Plan">{planChangePreview.currentPlanName}</ProfileField>
                  <ProfileField label="Target Plan">{planChangePreview.targetPlanName}</ProfileField>
                  <ProfileField label="Effective">
                    {planChangePreview.effectiveLabel}
                  </ProfileField>
                  <ProfileField label={planChangePreview.kind === "upgrade" ? "Prorated Charge Now" : "Charge Now"}>
                    {planChangePreview.kind === "upgrade"
                      ? formatMoney(planChangePreview.amountDueCents, planChangePreview.currency)
                      : formatMoney(0, planChangePreview.currency)}
                  </ProfileField>
                  <ProfileField label="Next Billing Date">{planChangePreview.nextBillingLabel}</ProfileField>
                </dl>
                <p className="member-crm-record__note">{planChangePreview.message}</p>
                {planChangePreview.kind !== "same_plan" ? (
                  <form action={asFormAction(applyMemberPlanChange)}>
                    <input type="hidden" name="memberId" value={member.id} />
                    <input type="hidden" name="targetKey" value={planChangePreview.targetKey} />
                    <ClientAuthorizationFields
                      reasonName="changeReason"
                      reasonPlaceholder="Example: Member requested upgrade by phone on Apr 15; confirmed immediate prorated charge."
                    />
                    <button type="submit" className="admin-btn admin-btn--primary" style={{ marginTop: "0.75rem" }}>
                      {planChangePreview.kind === "upgrade" ? "Apply upgrade in Stripe" : "Schedule change in Stripe"}
                    </button>
                  </form>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section id="communication" title="Communication" description="Email preferences, referral context, lifecycle context, and role scaffolding.">
        <dl className="member-crm-profile-grid">
          <ProfileField label="Marketing Email">
            {member.email_unsubscribed ? "Unsubscribed" : "Subscribed / not opted out"}
            <span className="member-crm-muted">
              App flag from member.email_unsubscribed. Our unsubscribe route syncs to AC; direct AC opt-outs need the webhook/reconciliation task.
            </span>
          </ProfileField>
          <ProfileField label="Password">
            {member.password_set ? "Password set" : "Magic-link / password not set"}
          </ProfileField>
          <ProfileField label="Admin Roles">
            {roles.length > 0 ? roles.map((role) => role.role_name).join(", ") : "No role assigned"}
          </ProfileField>
          <ProfileField label="Member ID">
            <span className="member-crm-mono">{member.id}</span>
          </ProfileField>
        </dl>
        <div className="member-crm-grid-2" style={{ marginTop: "1.25rem" }}>
          <div className="member-crm-card">
            <p className="member-crm-card-title member-crm-card-title--row">
              Affiliate & referral
              {member.fp_promoter_id ? (
                <a
                  href="https://positives.firstpromoter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="member-crm-link"
                >
                  Open portal
                </a>
              ) : null}
            </p>
            <dl className="member-crm-profile-grid">
              <ProfileField label="Promoter ID">
                {member.fp_promoter_id ? (
                  <span className="member-crm-mono">{member.fp_promoter_id}</span>
                ) : "Not an affiliate"}
              </ProfileField>
              <ProfileField label="Referral Code">
                {member.fp_ref_id ? (
                  <span className="member-crm-mono">{member.fp_ref_id}</span>
                ) : "Not set"}
              </ProfileField>
              <ProfileField label="Referral Link">
                {member.fp_ref_id ? (
                  <a
                    href={`https://positives.life?fpr=${member.fp_ref_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="member-crm-link member-crm-mono"
                  >
                    positives.life?fpr={member.fp_ref_id}
                  </a>
                ) : "Not available"}
              </ProfileField>
              <ProfileField label="Referred By">
                {member.referred_by_fpr ? (
                  <span className="member-crm-mono">{member.referred_by_fpr}</span>
                ) : "No referral source stored"}
              </ProfileField>
              <ProfileField label="Payout Email">
                {member.paypal_email ?? "Not set"}
              </ProfileField>
            </dl>
          </div>
          <div className="member-crm-card">
            <p className="member-crm-card-title">Assigned admin roles</p>
            {roles.length > 0 ? (
              <div className="member-crm-list">
                {roles.map((role) => (
                  <div key={role.role_key} className="member-crm-record" style={{ alignItems: "center" }}>
                    <div>
                      <p className="member-crm-record__title">{role.role_name}</p>
                      <p className="member-crm-record__meta">
                        {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <form action={asFormAction(removeAdminRoleFromMember)}>
                      <input type="hidden" name="memberId" value={member.id} />
                      <input type="hidden" name="roleKey" value={role.role_key} />
                      <button type="submit" className="admin-btn admin-btn--outline" style={{ fontSize: "0.75rem" }}>
                        Remove
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No admin role assigned.</EmptyState>
            )}
          </div>
          <form action={asFormAction(assignAdminRoleToMember)} className="member-crm-card">
            <input type="hidden" name="memberId" value={member.id} />
            <p className="member-crm-card-title">Assign role</p>
            <Select name="roleId" required>
              <option value="">Choose role...</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
            <button type="submit" className="admin-btn admin-btn--primary" style={{ marginTop: "0.75rem" }}>
              Assign role
            </button>
          </form>
        </div>
      </Section>

      <Section id="notes" title="Notes" description="Internal-only admin and coaching notes.">
        <div className="member-crm-grid-2">
          <div className="member-crm-list">
            {notes.length > 0 ? notes.map((note) => (
              <div key={note.id} className="member-crm-card" style={{ borderColor: note.pinned ? "rgba(245,158,11,0.35)" : undefined }}>
                <p style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", lineHeight: 1.65 }}>{note.body}</p>
                <p className="member-crm-record__meta">
                  {note.pinned ? "Pinned · " : ""}
                  {note.author?.name ?? note.author?.email ?? "Admin"} · {formatDateTime(note.created_at)}
                </p>
              </div>
            )) : (
              <EmptyState>No internal notes yet.</EmptyState>
            )}
          </div>
          <form action={asFormAction(addMemberAdminNote)} className="member-crm-card">
            <input type="hidden" name="memberId" value={member.id} />
            <p className="member-crm-card-title">Add note</p>
            <TextArea name="body" required placeholder="Internal coaching/support note..." />
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.75rem", fontSize: "0.8125rem" }}>
              <input type="checkbox" name="pinned" />
              Pin this note
            </label>
            <button type="submit" className="admin-btn admin-btn--primary" style={{ marginTop: "0.75rem" }}>
              Save note
            </button>
          </form>
        </div>
      </Section>

      <Section id="documents" title="Documents" description="Internal document uploads and references for coaching and support.">
        <div className="member-crm-grid-2">
          <div className="member-crm-list">
            {documents.length > 0 ? documents.map((document) => (
              <div key={document.id} className="member-crm-card">
                <p className="member-crm-record__title">{document.title}</p>
                {document.storage_path || document.external_url ? (
                  <a
                    href={
                      document.storage_path
                        ? `/admin/members/${member.id}/documents/${document.id}`
                        : document.external_url ?? "#"
                    }
                    target={document.storage_path ? undefined : "_blank"}
                    rel={document.storage_path ? undefined : "noopener noreferrer"}
                    style={{ color: "var(--color-primary)", fontSize: "0.8125rem" }}
                  >
                    Open document ↗
                  </a>
                ) : null}
                {document.note ? (
                  <p className="member-crm-record__note">{document.note}</p>
                ) : null}
                <p className="member-crm-record__meta">
                  {document.file_name ? `${document.file_name} ${formatBytes(document.size_bytes) ? `· ${formatBytes(document.size_bytes)}` : ""} · ` : ""}
                  Internal only · {formatDateTime(document.created_at)}
                </p>
              </div>
            )) : (
              <EmptyState>No internal documents yet.</EmptyState>
            )}
          </div>
          <form action={asFormAction(addMemberDocumentReference)} className="member-crm-card" encType="multipart/form-data">
            <input type="hidden" name="memberId" value={member.id} />
            <p className="member-crm-card-title">Add document</p>
            <label className="admin-form-field">
              <span className="admin-search-bar__label">Title</span>
              <TextInput name="title" required placeholder="Coaching worksheet" />
            </label>
            <label className="admin-form-field" style={{ marginTop: "0.75rem" }}>
              <span className="admin-search-bar__label">Upload file</span>
              <TextInput name="documentFile" type="file" />
              <span className="member-crm-muted">Private files are limited to 10 MB.</span>
            </label>
            <label className="admin-form-field" style={{ marginTop: "0.75rem" }}>
              <span className="admin-search-bar__label">Or URL</span>
              <TextInput name="externalUrl" placeholder="https://..." />
            </label>
            <label className="admin-form-field" style={{ marginTop: "0.75rem" }}>
              <span className="admin-search-bar__label">Note</span>
              <TextArea name="note" placeholder="Internal context..." />
            </label>
            <ClientAuthorizationFields
              reasonName="documentReason"
              reasonPlaceholder="Why is this document being added to the member record?"
            />
            <button type="submit" className="admin-btn admin-btn--primary" style={{ marginTop: "0.75rem" }}>
              Save document
            </button>
          </form>
        </div>
      </Section>

      <Section id="audit" title="Audit Log" description="Immutable record of admin mutations on this member.">
        {audit.length > 0 ? (
          <div className="member-crm-timeline">
            {audit.map((entry) => (
              <div key={entry.id} className="member-crm-timeline-item">
                <span className="member-crm-timeline-dot" aria-hidden="true" />
                <div>
                  <p className="member-crm-record__title">{entry.action}</p>
                  <p className="member-crm-record__meta">
                    {formatDateTime(entry.created_at)}
                    {entry.reason ? ` · ${entry.reason}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>No audit entries yet.</EmptyState>
        )}
      </Section>
    </div>
  );
}
