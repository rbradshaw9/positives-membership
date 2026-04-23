export type BetaFeedbackStatus =
  | "new"
  | "triaged"
  | "investigating"
  | "waiting_on_member"
  | "resolved"
  | "closed";

export type BetaFeedbackSeverity = "low" | "medium" | "high" | "blocker";

export type BetaFeedbackCategory =
  | "bug"
  | "ux"
  | "content"
  | "billing"
  | "performance"
  | "idea"
  | "other";

export type BetaFeedbackCommentVisibility = "internal" | "member";

export const BETA_FEEDBACK_STATUS_OPTIONS: Array<{
  value: BetaFeedbackStatus;
  label: string;
}> = [
  { value: "new", label: "New" },
  { value: "triaged", label: "Triaged" },
  { value: "investigating", label: "Investigating" },
  { value: "waiting_on_member", label: "Waiting on Member" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const BETA_FEEDBACK_SEVERITY_OPTIONS: Array<{
  value: BetaFeedbackSeverity;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "blocker", label: "Blocker" },
];

export const BETA_FEEDBACK_CATEGORY_OPTIONS: Array<{
  value: BetaFeedbackCategory;
  label: string;
  helper: string;
}> = [
  { value: "bug", label: "Bug", helper: "Something broke or behaved incorrectly." },
  { value: "ux", label: "UX friction", helper: "The flow was confusing, unclear, or awkward." },
  { value: "content", label: "Content issue", helper: "Something about the content felt wrong, thin, or misleading." },
  { value: "billing", label: "Billing / access", helper: "Payment, plan, or access did not behave as expected." },
  { value: "performance", label: "Slow / glitchy", helper: "The page felt slow, laggy, or unstable." },
  { value: "idea", label: "Idea", helper: "A suggestion that could improve the experience." },
  { value: "other", label: "Other", helper: "Something else worth flagging." },
];

export const BETA_FEEDBACK_STATUS_LABEL = Object.fromEntries(
  BETA_FEEDBACK_STATUS_OPTIONS.map((option) => [option.value, option.label])
) as Record<BetaFeedbackStatus, string>;

export const BETA_FEEDBACK_SEVERITY_LABEL = Object.fromEntries(
  BETA_FEEDBACK_SEVERITY_OPTIONS.map((option) => [option.value, option.label])
) as Record<BetaFeedbackSeverity, string>;

export const BETA_FEEDBACK_CATEGORY_LABEL = Object.fromEntries(
  BETA_FEEDBACK_CATEGORY_OPTIONS.map((option) => [option.value, option.label])
) as Record<BetaFeedbackCategory, string>;

export const BETA_FEEDBACK_COMMENT_VISIBILITY_OPTIONS: Array<{
  value: BetaFeedbackCommentVisibility;
  label: string;
  helper: string;
}> = [
  {
    value: "internal",
    label: "Internal only",
    helper: "Visible to admins only. Good for triage notes and implementation thinking.",
  },
  {
    value: "member",
    label: "Visible to member",
    helper: "Use when you need clarification or want to share a follow-up with the tester.",
  },
];

export const BETA_FEEDBACK_COMMENT_VISIBILITY_LABEL = Object.fromEntries(
  BETA_FEEDBACK_COMMENT_VISIBILITY_OPTIONS.map((option) => [option.value, option.label])
) as Record<BetaFeedbackCommentVisibility, string>;

export function isBetaFeedbackStatus(value: string): value is BetaFeedbackStatus {
  return BETA_FEEDBACK_STATUS_OPTIONS.some((option) => option.value === value);
}

export function isBetaFeedbackSeverity(value: string): value is BetaFeedbackSeverity {
  return BETA_FEEDBACK_SEVERITY_OPTIONS.some((option) => option.value === value);
}

export function isBetaFeedbackCategory(value: string): value is BetaFeedbackCategory {
  return BETA_FEEDBACK_CATEGORY_OPTIONS.some((option) => option.value === value);
}

export function isBetaFeedbackCommentVisibility(
  value: string
): value is BetaFeedbackCommentVisibility {
  return BETA_FEEDBACK_COMMENT_VISIBILITY_OPTIONS.some((option) => option.value === value);
}
