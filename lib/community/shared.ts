export const COMMUNITY_POST_TYPE_OPTIONS = [
  { value: "reflection", label: "Reflection" },
  { value: "question", label: "Question" },
  { value: "share", label: "Share" },
] as const;

export const COMMUNITY_REPORT_REASON_OPTIONS = [
  { value: "safety", label: "Safety concern" },
  { value: "spam", label: "Spam or promotion" },
  { value: "harassment", label: "Harassment or disrespect" },
  { value: "misinformation", label: "Misleading or harmful advice" },
  { value: "other", label: "Something else" },
] as const;

export const COMMUNITY_REPORT_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
] as const;

export const COMMUNITY_MODERATION_STATUS_OPTIONS = [
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
  { value: "removed", label: "Removed" },
] as const;

export type CommunityPostType = (typeof COMMUNITY_POST_TYPE_OPTIONS)[number]["value"];
export type CommunityThreadSourceType = "weekly_principle" | "standalone";
export type CommunityModerationStatus = (typeof COMMUNITY_MODERATION_STATUS_OPTIONS)[number]["value"];
export type CommunityReportReason = (typeof COMMUNITY_REPORT_REASON_OPTIONS)[number]["value"];
export type CommunityReportStatus = (typeof COMMUNITY_REPORT_STATUS_OPTIONS)[number]["value"];

export function isCommunityPostType(value: string): value is CommunityPostType {
  return COMMUNITY_POST_TYPE_OPTIONS.some((option) => option.value === value);
}

export function isCommunityReportReason(value: string): value is CommunityReportReason {
  return COMMUNITY_REPORT_REASON_OPTIONS.some((option) => option.value === value);
}

export function isCommunityReportStatus(value: string): value is CommunityReportStatus {
  return COMMUNITY_REPORT_STATUS_OPTIONS.some((option) => option.value === value);
}

export function isCommunityModerationStatus(value: string): value is CommunityModerationStatus {
  return COMMUNITY_MODERATION_STATUS_OPTIONS.some((option) => option.value === value);
}

export function getCommunityPostTypeLabel(value: CommunityPostType) {
  return COMMUNITY_POST_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getCommunityReportReasonLabel(value: CommunityReportReason) {
  return COMMUNITY_REPORT_REASON_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
