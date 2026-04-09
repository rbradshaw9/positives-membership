export type AffiliateDestinationKey =
  | "home"
  | "join"
  | "about"
  | "faq"
  | "support";

export interface AffiliateDestinationOption {
  key: AffiliateDestinationKey;
  label: string;
  detail: string;
  path: string;
}

export const AFFILIATE_DESTINATIONS: AffiliateDestinationOption[] = [
  {
    key: "home",
    label: "Homepage",
    detail: "Best all-purpose introduction to Positives",
    path: "/",
  },
  {
    key: "join",
    label: "Join page",
    detail: "Best when someone is ready to explore plans",
    path: "/join",
  },
  {
    key: "about",
    label: "About",
    detail: "Good for people who want more context first",
    path: "/about",
  },
  {
    key: "faq",
    label: "FAQ",
    detail: "Helpful when someone has practical questions",
    path: "/faq",
  },
  {
    key: "support",
    label: "Support",
    detail: "Use when you are sending someone to help or contact info",
    path: "/support",
  },
];

export function getAffiliateDestination(
  key: string
): AffiliateDestinationOption | null {
  return AFFILIATE_DESTINATIONS.find((destination) => destination.key === key) ?? null;
}

export function buildTrackedAffiliateUrl(input: {
  token: string;
  destinationKey: AffiliateDestinationKey;
  subId?: string | null;
  appUrl?: string;
}): string {
  const destination = getAffiliateDestination(input.destinationKey);

  if (!destination) {
    throw new Error(`Unknown affiliate destination: ${input.destinationKey}`);
  }

  const baseUrl = new URL(input.appUrl ?? "https://positives.life");
  const url = new URL(destination.path, baseUrl);
  url.searchParams.set("fpr", input.token);

  const subId = input.subId?.trim();
  if (subId) {
    url.searchParams.set("sub_id", subId);
  }

  return url.toString();
}
