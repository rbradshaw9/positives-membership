"use client";

import { useActionState } from "react";

type ActionResult = { error?: string; success?: string };

type MemberProfileFormData = {
  id: string;
  name: string | null;
  timezone: string | null;
  assignedCoachId: string | null;
  followupStatus: string | null;
  followupNote: string | null;
  subscriptionStatusLabel: string;
  tierLabel: string;
};

type CoachOption = {
  id: string;
  label: string;
};

type Props = {
  member: MemberProfileFormData;
  coaches: CoachOption[];
  action: (previousState: ActionResult, formData: FormData) => Promise<ActionResult>;
};

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

function InlineAlert({ state }: { state: ActionResult }) {
  if (!state.error && !state.success) return null;

  return (
    <div
      role={state.error ? "alert" : "status"}
      className={`member-crm-inline-alert ${
        state.error ? "member-crm-inline-alert--error" : "member-crm-inline-alert--success"
      }`}
    >
      {state.error ?? state.success}
    </div>
  );
}

export function MemberCrmProfileForm({ member, coaches, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="member-crm-form-grid">
      <input type="hidden" name="memberId" value={member.id} />
      <div className="member-crm-warning-note">
        <strong>Stripe is the source of truth for billing and subscription tier.</strong>{" "}
        This page no longer saves direct status/tier edits because that would not update the
        member&apos;s invoice or subscription. Use the Stripe-backed plan-change tooling below
        for billing changes.
      </div>
      <div className="member-crm-readonly-grid" aria-label="Stripe billing state">
        <div className="member-crm-readonly-field">
          <span className="admin-search-bar__label">Subscription Status</span>
          <p className="member-crm-readonly-field__value">{member.subscriptionStatusLabel}</p>
        </div>
        <div className="member-crm-readonly-field">
          <span className="admin-search-bar__label">Tier</span>
          <p className="member-crm-readonly-field__value">{member.tierLabel}</p>
        </div>
      </div>
      <InlineAlert state={state} />
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
        <Select name="assignedCoachId" defaultValue={member.assignedCoachId ?? ""}>
          <option value="">Unassigned</option>
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="admin-form-field">
        <span className="admin-search-bar__label">Follow-up Status</span>
        <Select name="followupStatus" defaultValue={member.followupStatus ?? "none"}>
          <option value="none">No follow-up</option>
          <option value="needs_followup">Needs follow-up</option>
          <option value="waiting_on_member">Waiting on member</option>
          <option value="resolved">Resolved</option>
        </Select>
      </label>
      <label className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
        <span className="admin-search-bar__label">Follow-up Note</span>
        <TextArea name="followupNote" defaultValue={member.followupNote ?? ""} />
        <span className="member-crm-muted">
          Use this for the current next action. Use Notes below for dated history and coaching/support context.
        </span>
      </label>
      <div className="member-crm-authorization" style={{ gridColumn: "1 / -1" }}>
        <label className="member-crm-checkbox-row">
          <input type="checkbox" name="clientAuthorizationConfirmed" required />
          <span>
            I verified this change is authorized by the member/client or approved by the team.
          </span>
        </label>
        <label className="admin-form-field">
          <span className="admin-search-bar__label">Change reason</span>
          <TextArea
            name="changeReason"
            required
            placeholder="Who authorized this, and why are we making the change?"
          />
        </label>
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={isPending}>
          {isPending ? "Saving..." : "Save member management fields"}
        </button>
      </div>
    </form>
  );
}
