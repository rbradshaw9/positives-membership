import { memberHasAdminRoleKey, requireAdminPermission } from "@/lib/auth/require-admin";
import {
  getAdminBetaFeedbackQueue,
  type AdminBetaFeedbackFilters,
} from "@/lib/admin/beta-feedback";
import { getAdminAssignableMembers } from "@/lib/admin/member-crm";
import { getBetaFeedbackCommentsMap } from "@/lib/beta-feedback/data";
import {
  BETA_FEEDBACK_CATEGORY_OPTIONS,
  BETA_FEEDBACK_SEVERITY_OPTIONS,
  BETA_FEEDBACK_STATUS_OPTIONS,
  isBetaFeedbackCategory,
  isBetaFeedbackSeverity,
  isBetaFeedbackStatus,
} from "@/lib/beta-feedback/shared";
import { BetaFeedbackTriageCard } from "@/app/admin/beta-feedback/BetaFeedbackTriageCard";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCurrencyCount(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export default async function AdminBetaFeedbackPage({ searchParams }: PageProps) {
  const actor = await requireAdminPermission("members.read");
  const resolvedSearchParams = (await searchParams) ?? {};
  const statusValue = firstValue(resolvedSearchParams.status);
  const severityValue = firstValue(resolvedSearchParams.severity);
  const categoryValue = firstValue(resolvedSearchParams.category);
  const assignedValue = firstValue(resolvedSearchParams.assigned);
  const approvalValue = firstValue(resolvedSearchParams.approval);
  const searchValue = firstValue(resolvedSearchParams.search)?.trim() ?? "";
  const normalizedStatusValue = statusValue ?? "";
  const normalizedSeverityValue = severityValue ?? "";
  const normalizedCategoryValue = categoryValue ?? "";
  const statusFilter: AdminBetaFeedbackFilters["status"] = isBetaFeedbackStatus(
    normalizedStatusValue
  )
    ? normalizedStatusValue
    : "";
  const severityFilter: AdminBetaFeedbackFilters["severity"] = isBetaFeedbackSeverity(
    normalizedSeverityValue
  )
    ? normalizedSeverityValue
    : "";
  const categoryFilter: AdminBetaFeedbackFilters["category"] = isBetaFeedbackCategory(
    normalizedCategoryValue
  )
    ? normalizedCategoryValue
    : "";
  const assignedFilter: AdminBetaFeedbackFilters["assigned"] =
    assignedValue === "mine" || assignedValue === "unassigned" ? assignedValue : "";
  const approvalFilter: AdminBetaFeedbackFilters["approval"] =
    approvalValue === "approved" || approvalValue === "pending" ? approvalValue : "";

  const filters: AdminBetaFeedbackFilters = {
    status: statusFilter,
    severity: severityFilter,
    category: categoryFilter,
    assigned: assignedFilter,
    approval: approvalFilter,
    search: searchValue,
    actorId: actor.id,
  };

  const [queue, assignableMembers] = await Promise.all([
    getAdminBetaFeedbackQueue(filters),
    getAdminAssignableMembers(),
  ]);
  const isSuperAdmin = await memberHasAdminRoleKey(actor.id, "super_admin");
  const commentsMap = await getBetaFeedbackCommentsMap(queue.map((item) => item.id), "all");

  const stats = {
    total: queue.length,
    blockers: queue.filter((item) => item.severity === "blocker").length,
    unresolved: queue.filter((item) => !["resolved", "closed"].includes(item.status)).length,
    unassigned: queue.filter((item) => !item.assigned_member_id).length,
    approved: queue.filter((item) => item.approved_for_development).length,
  };

  return (
    <section className="space-y-8">
      <div className="rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(46,196,182,0.12),rgba(61,182,231,0.1),rgba(255,255,255,0.96))] p-6 shadow-[0_30px_100px_rgba(15,23,42,0.06)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-600">
          Beta operations
        </p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-[2.6rem] font-semibold tracking-[-0.06em] text-slate-950">
              Beta feedback queue
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              This is the working queue for beta bugs, UX friction, billing questions, and anything else testers send from inside the app. We&apos;re keeping the signal tight by auto-capturing page, browser, and release context on every submission.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">In queue</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{stats.total}</p>
              <p className="mt-1 text-sm text-slate-600">{formatCurrencyCount(stats.unresolved, "open item")}</p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Blockers</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{stats.blockers}</p>
              <p className="mt-1 text-sm text-slate-600">Highest-urgency reports</p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Unassigned</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{stats.unassigned}</p>
              <p className="mt-1 text-sm text-slate-600">Needs an owner</p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Approved</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {stats.approved}
              </p>
              <p className="mt-1 text-sm text-slate-600">Ready for development</p>
            </div>
          </div>
        </div>
      </div>

      <form className="grid gap-4 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] lg:grid-cols-[minmax(0,1.3fr)_repeat(5,minmax(0,0.66fr))]">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Search</span>
          <input
            type="search"
            name="search"
            defaultValue={searchValue}
            placeholder="Member, email, summary, or detail text"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</span>
          <select
            name="status"
            defaultValue={filters.status}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
          >
            <option value="">All statuses</option>
            {BETA_FEEDBACK_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Severity</span>
          <select
            name="severity"
            defaultValue={filters.severity}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
          >
            <option value="">All severities</option>
            {BETA_FEEDBACK_SEVERITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</span>
          <select
            name="category"
            defaultValue={filters.category}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
          >
            <option value="">All categories</option>
            {BETA_FEEDBACK_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Owner</span>
          <select
            name="assigned"
            defaultValue={filters.assigned}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
          >
            <option value="">Anyone</option>
            <option value="mine">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Approval</span>
          <select
            name="approval"
            defaultValue={filters.approval}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
          >
            <option value="">All approval states</option>
            <option value="pending">Needs approval</option>
            <option value="approved">Approved for development</option>
          </select>
        </label>

        <div className="flex items-end gap-3 lg:col-span-6">
          <button
            type="submit"
            className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(46,196,182,0.24)]"
          >
            Update queue
          </button>
          <a
            href="/admin/beta-feedback"
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
          >
            Reset
          </a>
        </div>
      </form>

      <div className="space-y-5">
        {queue.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-lg font-semibold tracking-[-0.03em] text-slate-900">No feedback matches those filters.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Once beta testers start sending reports, this queue will become the fastest place to see what&apos;s breaking, what feels confusing, and what needs follow-up.
            </p>
          </div>
        ) : (
          queue.map((feedback) => (
            <BetaFeedbackTriageCard
              key={feedback.id}
              feedback={{
                ...feedback,
                comments: commentsMap.get(feedback.id) ?? [],
              }}
              assignableMembers={assignableMembers}
              isSuperAdmin={isSuperAdmin}
            />
          ))
        )}
      </div>
    </section>
  );
}
