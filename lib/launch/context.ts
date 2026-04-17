export type LaunchCohort = "alpha" | "beta" | "live";
export type LaunchAccessOffer = "standard" | "free" | "paid_test" | "discount";

export type LaunchContext = {
  launchCohort: LaunchCohort;
  launchSource: string;
  launchCampaignCode: string | null;
};

function clean(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function isLaunchCohort(value: string | null | undefined): value is LaunchCohort {
  return value === "alpha" || value === "beta" || value === "live";
}

export function normalizeLaunchAccessOffer(
  value: string | null | undefined,
  fallback: LaunchAccessOffer = "standard"
): LaunchAccessOffer {
  switch (clean(value)?.toLowerCase()) {
    case "free":
      return "free";
    case "paid-test":
    case "paid_test":
    case "billing-test":
    case "billing_test":
      return "paid_test";
    case "discount":
      return "discount";
    case "standard":
      return "standard";
    default:
      return fallback;
  }
}

export function getInviteLaunchSource(
  cohort: LaunchCohort,
  offer: LaunchAccessOffer
) {
  if (offer === "standard") {
    return cohort === "alpha" ? "alpha_invite" : cohort === "beta" ? "beta_invite" : "public_join";
  }

  return `${cohort}_invite_${offer}`;
}

export function sanitizeLaunchCampaignCode(value: string | null | undefined) {
  const cleaned = clean(value)
    ?.toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return cleaned && cleaned.length > 0 ? cleaned.slice(0, 80) : null;
}

export function resolveLaunchContext(input: {
  cohort?: string | null;
  source?: string | null;
  campaignCode?: string | null;
  fallbackCohort?: LaunchCohort;
  fallbackSource: string;
}): LaunchContext {
  const launchCohort = isLaunchCohort(input.cohort)
    ? input.cohort
    : (input.fallbackCohort ?? "live");
  const launchSource = clean(input.source) ?? input.fallbackSource;
  const launchCampaignCode = sanitizeLaunchCampaignCode(input.campaignCode);

  return {
    launchCohort,
    launchSource,
    launchCampaignCode,
  };
}
