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

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function BetaFeedbackTriageCard({ feedback, assignableMembers }: Props) {
  const [state, formAction, pending] = useActionState(updateBetaFeedbackSubmission, INITIAL_STATE);

  return (
    <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneForSeverity(feedback.severity)}`}>
              {BETA_FEEDBACK_SEVERITY_LABEL[feedback.severity]}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneForStatus(feedback.status)}`}>
              {BETA_FEEDBACK_STATUS_LABEL[feedback.status]}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              {BETA_FEEDBACK_CATEGORY_LABEL[feedback.category]}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
              {feedback.summary}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {feedback.details}
            </p>
          </div>
        </div>

        <div className="min-w-[220px] rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
          <div className="space-y-2">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Reported by</p>
              <p className="mt-1 font-medium text-slate-900">
                {feedback.member_name || feedback.member_email}
              </p>
              <p className="text-xs text-slate-500">{feedback.member_email}</p>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Submitted</p>
              <p className="mt-1 text-slate-900">{formatDate(feedback.created_at)}</p>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Context</p>
              <p className="mt-1 text-slate-900">
                {[feedback.browser_name, feedback.os_name, feedback.device_type].filter(Boolean).join(" • ") || "No browser context"}
              </p>
              <p className="text-xs text-slate-500">
                {feedback.page_path || feedback.page_url || "Page not captured"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {feedback.expected_behavior ? (
        <div className="mt-4 rounded-[24px] border border-sky-100 bg-sky-50/70 p-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-sky-600">Expected instead</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{feedback.expected_behavior}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
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

      <form action={formAction} className="mt-5 grid gap-4 rounded-[26px] border border-slate-200/80 bg-slate-50/70 p-4 md:grid-cols-2 md:p-5">
        <input type="hidden" name="feedbackId" value={feedback.id} />

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

        <label className="grid gap-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Triage notes</span>
          <textarea
            name="triageNotes"
            rows={4}
            defaultValue={feedback.triage_notes ?? ""}
            placeholder="Capture the root cause, next step, or what you need from the member."
            className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400"
          />
        </label>

        <div className="md:col-span-2">
          <MemberCrmInlineAlert state={state} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
          <div className="text-xs leading-5 text-slate-500">
            Release {feedback.app_release || "unknown"} {feedback.timezone ? `• ${feedback.timezone}` : ""}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(46,196,182,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Saving..." : "Save triage"}
          </button>
        </div>
      </form>
    </article>
  );
}
