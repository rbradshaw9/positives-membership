import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getOpsHealthSnapshot } from "@/lib/admin/ops-health";

export const metadata = {
  title: "Ops Health — Positives Admin",
};

type Tone = "good" | "watch" | "risk" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  good: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
  watch: "border-amber-200 bg-amber-50/70 text-amber-800",
  risk: "border-rose-200 bg-rose-50/70 text-rose-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}

function HealthCard({
  title,
  eyebrow,
  tone,
  children,
  href,
  cta,
}: {
  title: string;
  eyebrow: string;
  tone: Tone;
  children: React.ReactNode;
  href?: string;
  cta?: string;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
            {title}
          </h2>
        </div>
        <StatusPill tone={tone}>
          {tone === "good" ? "Healthy" : tone === "risk" ? "Needs attention" : tone === "watch" ? "Watch" : "Info"}
        </StatusPill>
      </div>
      <div className="mt-5">{children}</div>
      {href && cta ? (
        <Link
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noreferrer" : undefined}
          className="mt-5 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
        >
          {cta}
        </Link>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{value}</p>
    </div>
  );
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "n/a";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
    >
      {children}
    </Link>
  );
}

export default async function AdminOpsPage() {
  await requireAdminPermission("members.read");
  const snapshot = await getOpsHealthSnapshot();

  return (
    <section className="space-y-8">
      <div className="rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(46,196,182,0.12),rgba(61,182,231,0.1),rgba(255,255,255,0.96))] p-6 shadow-[0_30px_100px_rgba(15,23,42,0.06)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-600">
          Beta operations
        </p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-[2.6rem] font-semibold tracking-[-0.06em] text-slate-950">
              Ops Health
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              A lightweight command center for beta feedback, errors, billing readiness, data health, and deployment links.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/85 px-5 py-4 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Last checked
            </p>
            <p className="mt-1 font-medium text-slate-950">
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(snapshot.generatedAt))}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <HealthCard
          eyebrow="Intake"
          title="Beta Feedback"
          tone={snapshot.feedback.tone}
          href="/admin/beta-feedback"
          cta="Open feedback queue"
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Total" value={snapshot.feedback.total} />
            <Metric label="Open" value={snapshot.feedback.open} />
            <Metric label="High+" value={snapshot.feedback.blockerHigh} />
            <Metric label="Unassigned" value={snapshot.feedback.unassigned} />
          </div>
          {snapshot.feedback.latest.length > 0 ? (
            <div className="mt-4 space-y-2">
              {snapshot.feedback.latest.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm">
                  <p className="font-semibold text-slate-900">{item.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.status} · {item.severity} · {item.member_email}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </HealthCard>

        <HealthCard
          eyebrow="Errors"
          title="Sentry"
          tone={snapshot.sentry.tone}
          href={snapshot.links.sentryIssues}
          cta="Open Sentry issues"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric
              label="Unresolved"
              value={snapshot.sentry.unresolvedCount ?? "Needs config"}
            />
            <Metric
              label="Active cron monitors"
              value={snapshot.sentry.monitors.filter((monitor) => monitor.status === "active").length}
            />
          </div>
          {snapshot.sentry.slowTransactions.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Slowest Sentry transactions, p75 over 14 days</p>
              <div className="mt-3 space-y-2">
                {snapshot.sentry.slowTransactions.slice(0, 4).map((transaction) => (
                  <div
                    key={transaction.transaction}
                    className="flex items-center justify-between gap-4 rounded-xl bg-white px-3 py-2"
                  >
                    <span className="truncate font-medium text-slate-800">{transaction.transaction}</span>
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {formatDuration(transaction.p75Ms)} · {transaction.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {snapshot.sentry.watchlist.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Beta route watchlist</p>
              <div className="mt-3 space-y-2">
                {snapshot.sentry.watchlist.map((item) => (
                  <div
                    key={item.route}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.route}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {item.metrics ? `${formatDuration(item.metrics.p75Ms)} · ${item.metrics.count}` : "n/a"}
                      </span>
                      <ExternalLink href={item.href}>Open route</ExternalLink>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {snapshot.sentry.error ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {snapshot.sentry.error}
            </p>
          ) : null}
          {snapshot.sentry.issues.length > 0 ? (
            <div className="mt-4 space-y-2">
              {snapshot.sentry.issues.slice(0, 3).map((issue) => (
                <Link
                  key={issue.id}
                  href={issue.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm transition hover:border-teal-200"
                >
                  <p className="font-semibold text-slate-900">{issue.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {issue.shortId || "Sentry"} · {issue.count} event{issue.count === "1" ? "" : "s"}
                  </p>
                </Link>
              ))}
            </div>
          ) : null}
        </HealthCard>

        <HealthCard
          eyebrow="Billing"
          title="Stripe"
          tone={snapshot.stripe.tone}
          href={snapshot.links.stripeWebhooks}
          cta="Open Stripe webhooks"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Mode" value={snapshot.stripe.mode} />
            <Metric
              label="Charges"
              value={snapshot.stripe.account?.chargesEnabled ? "On" : "Off"}
            />
            <Metric
              label="Payouts"
              value={snapshot.stripe.account?.payoutsEnabled ? "On" : "Off"}
            />
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Expected webhook</p>
            <p className="mt-1 break-all">{snapshot.stripe.expectedWebhookUrl}</p>
            <p className="mt-2">
              Match:{" "}
              <span className="font-semibold text-slate-900">
                {snapshot.stripe.matchingWebhook?.status ?? "not found"}
              </span>
            </p>
          </div>
          {snapshot.stripe.error ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {snapshot.stripe.error}
            </p>
          ) : null}
        </HealthCard>

        <HealthCard
          eyebrow="Data"
          title="Supabase"
          tone={snapshot.supabase.error ? "watch" : snapshot.supabase.feedbackBucket.tone}
          href={snapshot.links.supabaseLogs}
          cta="Open Supabase logs"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="DB" value={snapshot.supabase.connected ? "Connected" : "Check"} />
            <Metric label="Early users" value={snapshot.supabase.earlyReleaseMembers} />
            <Metric
              label="Feedback bucket"
              value={snapshot.supabase.feedbackBucket.exists ? "Ready" : "Missing"}
            />
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
            <p>
              Storage privacy:{" "}
              <span className="font-semibold text-slate-900">
                {snapshot.supabase.feedbackBucket.public === false ? "private" : "needs review"}
              </span>
            </p>
            <p className="mt-1">
              Upload limit:{" "}
              <span className="font-semibold text-slate-900">
                {snapshot.supabase.feedbackBucket.fileSizeLimit
                  ? `${Math.round(snapshot.supabase.feedbackBucket.fileSizeLimit / 1024 / 1024)} MB`
                  : "unknown"}
              </span>
            </p>
          </div>
        </HealthCard>

        <HealthCard
          eyebrow="Deploy"
          title="Vercel"
          tone={snapshot.vercel.tone}
          href={snapshot.links.vercelProject}
          cta="Open Vercel project"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Speed Insights" value={snapshot.vercel.speedInsightsWired ? "Wired" : "Check"} />
            <Metric label="Analytics" value={snapshot.vercel.analyticsWired ? "Wired" : "Check"} />
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Release context</p>
            <p className="mt-1 break-all">{snapshot.vercel.latestCommit ?? "No release env available locally"}</p>
            {snapshot.vercel.latestDeployment ? (
              <p className="mt-1 break-all">{snapshot.vercel.latestDeployment}</p>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ExternalLink href={snapshot.links.vercelDeployments}>Deployments</ExternalLink>
            <ExternalLink href={snapshot.links.vercelLogs}>Logs</ExternalLink>
            <ExternalLink href={snapshot.links.vercelSpeedInsights}>Speed Insights</ExternalLink>
            <ExternalLink href={snapshot.links.vercelAnalytics}>Analytics</ExternalLink>
          </div>
        </HealthCard>

        <HealthCard
          eyebrow="Work queue"
          title="Asana"
          tone={snapshot.asana.tone}
          href={snapshot.links.asanaBetaFeedback}
          cta="Open Beta Feedback Triage"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Open triage tasks" value={snapshot.asana.openTasks} />
            <Metric label="Section" value={snapshot.asana.sectionGid} />
          </div>
          {snapshot.asana.error ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {snapshot.asana.error}
            </p>
          ) : null}
          {snapshot.asana.tasks.length > 0 ? (
            <div className="mt-4 space-y-2">
              {snapshot.asana.tasks.slice(0, 3).map((task) => (
                <Link
                  key={task.gid}
                  href={task.permalink_url ?? snapshot.links.asanaBetaFeedback}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-teal-200"
                >
                  {task.name}
                </Link>
              ))}
            </div>
          ) : null}
        </HealthCard>
      </div>
    </section>
  );
}
