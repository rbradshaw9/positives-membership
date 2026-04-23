"use client";

import { useActionState } from "react";
import { updateBetaFeedbackSubmission } from "@/app/admin/beta-feedback/actions";
import {
  BETA_FEEDBACK_CATEGORY_LABEL,
  BETA_FEEDBACK_CATEGORY_OPTIONS,
  BETA_FEEDBACK_SEVERITY_LABEL,
  BETA_FEEDBACK_SEVERITY_OPTIONS,
  BETA_FEEDBACK_STATUS_LABEL,
  BETA_FEEDBACK_STATUS_OPTIONS,
} from "@/lib/beta-feedback/shared";
import type { AdminBetaFeedbackRecord } from "@/lib/admin/beta-feedback";
import { MemberCrmInlineAlert } from "@/app/admin/members/[id]/MemberCrmInlineForm";

type Props = {
  feedback: AdminBetaFeedbackRecord & {
    screenshotUrl?: string | null;
  };
  assignableMembers: Array<{ id: string; label: string }>;
};

type TriageActionState = {
  success?: string;
  error?: string;
};

const INITIAL_STATE: TriageActionState = {};

function toneForSeverity(severity: AdminBetaFeedbackRecord["severity"]) {
  switch (severity) {
    case "blocker":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function toneForStatus(status: AdminBetaFeedbackRecord["status"]) {
  switch (status) {
    case "resolved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "closed":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "investigating":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "waiting_on_member":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "triaged":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function toneForApproval(approved: boolean) {
  return approved
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-50 text-slate-500";
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function formatCompactDate(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function truncate(value: string | null, maxLength = 160) {
  if (!value) return "";
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

export function BetaFeedbackTriageCard({ feedback, assignableMembers }: Props) {
  const [state, formAction, pending] = useActionState(updateBetaFeedbackSubmission, INITIAL_STATE);
  const reporterLabel = feedback.member_name || feedback.member_email;
  const assigneeLabel = feedback.assignee?.name || feedback.assignee?.email || "Unassigned";
  const approverLabel = feedback.approver?.name || feedback.approver?.email || "An admin";
  const contextLabel =
    [feedback.browser_name, feedback.os_name, feedback.device_type].filter(Boolean).join(" • ") ||
    "No browser context";

  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_16px_44px_rgba(15,23,42,0.045)]">
      <details className="group">
        <summary className="grid cursor-pointer gap-4 px-4 py-4 transition hover:bg-slate-50/80 md:grid-cols-[minmax(0,1.2fr)_minmax(10rem,0.45fr)_minmax(9rem,0.34fr)_auto] md:items-center md:px-5 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${toneForSeverity(feedback.severity)}`}>
                {BETA_FEEDBACK_SEVERITY_LABEL[feedback.severity]}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${toneForStatus(feedback.status)}`}>
                {BETA_FEEDBACK_STATUS_LABEL[feedback.status]}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-600">
                {BETA_FEEDBACK_CATEGORY_LABEL[feedback.category]}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${toneForApproval(feedback.approved_for_development)}`}>
                {feedback.approved_for_development ? "Approved for dev" : "Needs approval"}
              </span>
            </div>
            <h2
              className="truncate text-base font-semibold tracking-[-0.02em] text-slate-950 md:text-lg"
              style={{ textWrap: "balance" }}
            >
              {feedback.summary}
            </h2>
            <p className="mt-1 line-clamp-1 text-sm leading-6 text-slate-600">
              {truncate(feedback.details, 180)}
            </p>
          </div>

          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-slate-900">{reporterLabel}</p>
            <p className="truncate text-xs text-slate-500">{feedback.member_email}</p>
            <p className="mt-1 text-xs text-slate-500">{formatCompactDate(feedback.created_at)}</p>
          </div>

          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-slate-900">{assigneeLabel}</p>
            <p className="truncate text-xs text-slate-500">{feedback.page_path || "No page captured"}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{contextLabel}</p>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-teal-700 md:justify-end">
            <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-2">
              View details + triage
            </span>
            <span className="text-lg transition group-open:rotate-180" aria-hidden="true">
              ↓
            </span>
          </div>
        </summary>

        <div className="grid gap-5 border-t border-slate-200/80 bg-slate-50/70 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.48fr)] lg:p-5">
          <div className="space-y-4">
            <section className="rounded-[22px] border border-slate-200/80 bg-white p-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Tester report
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-950">{feedback.summary}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{feedback.details}</p>
            </section>

            {feedback.expected_behavior ? (
              <section className="rounded-[22px] border border-sky-100 bg-sky-50/70 p-4">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-sky-600">
                  Expected instead
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {feedback.expected_behavior}
                </p>
              </section>
            ) : null}

            <section className="grid gap-3 rounded-[22px] border border-slate-200/80 bg-white p-4 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Reported by
                </p>
                <p className="mt-1 font-medium text-slate-900">{reporterLabel}</p>
                <p className="text-xs text-slate-500">{feedback.member_email}</p>
              </div>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Submitted
                </p>
                <p className="mt-1 text-slate-900">{formatDate(feedback.created_at)}</p>
              </div>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Context
                </p>
                <p className="mt-1 text-slate-900">{contextLabel}</p>
                <p className="text-xs text-slate-500">
                  {feedback.viewport_width && feedback.viewport_height
                    ? `${feedback.viewport_width} x ${feedback.viewport_height}`
                    : "Viewport not captured"}
                </p>
              </div>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Release
                </p>
                <p className="mt-1 text-slate-900">{feedback.app_release || "Unknown"}</p>
                <p className="text-xs text-slate-500">{feedback.timezone || "Timezone not captured"}</p>
              </div>
            </section>

            <div className="flex flex-wrap gap-3 text-sm">
              {feedback.member_id ? (
                <a
                  href={`/admin/members/${feedback.member_id}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700"
                >
                  Open member record
                </a>
              ) : null}
              {feedback.page_url ? (
                <a
                  href={feedback.page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700"
                >
                  Open reported page
                </a>
              ) : null}
              {feedback.screenshotUrl ? (
                <a
                  href={feedback.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700"
                >
                  View screenshot
                </a>
              ) : null}
              {feedback.loom_url ? (
                <a
                  href={feedback.loom_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700"
                >
                  Watch Loom
                </a>
              ) : null}
            </div>
          </div>

          <form action={formAction} className="grid content-start gap-4 rounded-[24px] border border-slate-200/80 bg-white p-4">
            <input type="hidden" name="feedbackId" value={feedback.id} />

            <div>
              <h3
                className="text-lg font-semibold tracking-[-0.03em] text-slate-950"
                style={{ textWrap: "balance" }}
              >
                Triage controls
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Save triage updates status, urgency, category, owner, internal notes, and development approval. Only approved items should be picked up for implementation. Resolved or closed items get a resolution timestamp, and member-linked updates are audit logged.
              </p>
            </div>

            <section className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Development approval
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Feedback stays in review until an admin explicitly approves it for development work.
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${toneForApproval(feedback.approved_for_development)}`}>
                  {feedback.approved_for_development ? "Approved" : "Pending"}
                </span>
              </div>

              <label className="mt-4 flex items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                <input
                  type="checkbox"
                  name="approvedForDevelopment"
                  defaultChecked={feedback.approved_for_development}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm leading-6 text-slate-700">
                  Mark this feedback as approved for development.
                </span>
              </label>

              {feedback.approved_for_development_at ? (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Approved {formatDate(feedback.approved_for_development_at)} by {approverLabel}.
                </p>
              ) : (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Leave this unchecked until an admin decides the item is ready to be worked on.
                </p>
              )}
            </section>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</span>
              <select
                name="status"
                defaultValue={feedback.status}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              >
                {BETA_FEEDBACK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Severity</span>
                <select
                  name="severity"
                  defaultValue={feedback.severity}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                >
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
                  defaultValue={feedback.category}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                >
                  {BETA_FEEDBACK_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Owner</span>
              <select
                name="assignedMemberId"
                defaultValue={feedback.assigned_member_id ?? ""}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              >
                <option value="">Unassigned</option>
                {assignableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Triage notes</span>
              <textarea
                name="triageNotes"
                rows={5}
                defaultValue={feedback.triage_notes ?? ""}
                placeholder="Capture the root cause, next step, or what you need from the member."
                className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400"
              />
            </label>

            <MemberCrmInlineAlert state={state} />

            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(46,196,182,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? "Saving..." : "Save triage updates"}
            </button>
          </form>
        </div>
      </details>
    </article>
  );
}
