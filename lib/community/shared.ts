export const COMMUNITY_POST_TYPE_OPTIONS = [
  { value: "share", label: "Wins" },
  { value: "reflection", label: "Support" },
  { value: "question", label: "Questions" },
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

export type CommunityLaneSlug = "wins" | "support" | "questions";

const COMMUNITY_LANE_META: Record<CommunityPostType, {
  slug: CommunityLaneSlug;
  label: string;
  shortLabel: string;
  description: string;
}> = {
  share: {
    slug: "wins",
    label: "Wins",
    shortLabel: "Win",
    description: "Celebrations, small shifts, and moments you want to share with the room.",
  },
  reflection: {
    slug: "support",
    label: "Support",
    shortLabel: "Support",
    description: "Grounded posts about what feels hard, tender, or worth talking through.",
  },
  question: {
    slug: "questions",
    label: "Questions",
    shortLabel: "Question",
    description: "Questions where member perspective or coach guidance could help.",
  },
};

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

export function getCommunityLaneSlug(value: CommunityPostType): CommunityLaneSlug {
  return COMMUNITY_LANE_META[value]?.slug ?? "support";
}

export function getCommunityLaneLabel(value: CommunityPostType) {
  return COMMUNITY_LANE_META[value]?.label ?? getCommunityPostTypeLabel(value);
}

export function getCommunityLaneShortLabel(value: CommunityPostType) {
  return COMMUNITY_LANE_META[value]?.shortLabel ?? getCommunityPostTypeLabel(value);
}

export function getCommunityLaneDescription(value: CommunityPostType) {
  return COMMUNITY_LANE_META[value]?.description ?? "";
}

export function getCommunityPostTypeFromLaneSlug(value: string): CommunityPostType | null {
  const match = Object.entries(COMMUNITY_LANE_META).find(([, meta]) => meta.slug === value);
  return (match?.[0] as CommunityPostType | undefined) ?? null;
}

export function getCommunityDisplayName(name: string | null | undefined) {
  if (!name) return "Member";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "Member";
  if (parts.length === 1) return parts[0];

  const first = parts[0];
  const lastInitial = parts[parts.length - 1]?.charAt(0).toUpperCase();
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

export function getCommunityReportReasonLabel(value: CommunityReportReason) {
  return COMMUNITY_REPORT_REASON_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
