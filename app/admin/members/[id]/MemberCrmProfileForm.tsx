"use client";

import { useActionState } from "react";
import { MemberCrmInlineAlert } from "./MemberCrmInlineForm";

type ActionResult = { error?: string; success?: string };

type MemberProfileFormData = {
  id: string;
  name: string | null;
  timezone: string | null;
  assignedCoachId: string | null;
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

export function MemberCrmProfileForm({ member, coaches, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const hasAssignableCoaches = coaches.length > 0;
  const currentAssignmentMissing =
    !!member.assignedCoachId && !coaches.some((coach) => coach.id === member.assignedCoachId);

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
      <MemberCrmInlineAlert state={state} />
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
          {currentAssignmentMissing ? (
            <option value={member.assignedCoachId ?? ""}>
              Current assignment (not currently an admin/coach)
            </option>
          ) : null}
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.label}
            </option>
          ))}
        </Select>
        <span className="member-crm-muted">
          Only members with an admin or coach role appear here.
          {hasAssignableCoaches
            ? " Use /admin/roles to adjust who is assignable."
            : " No assignable coach/admin users are seeded yet."}
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
