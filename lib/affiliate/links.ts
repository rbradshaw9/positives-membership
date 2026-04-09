const CANONICAL_PUBLIC_HOSTS = new Set(["positives.life", "www.positives.life"]);

function isInternalPositivesHost(hostname: string, appUrl: string): boolean {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, "");
  const appHost = new URL(appUrl).hostname.toLowerCase().replace(/^www\./, "");

  return normalizedHost === appHost || CANONICAL_PUBLIC_HOSTS.has(hostname.toLowerCase());
}

export function buildAffiliateRedirectUrl(params: {
  destination: string | null | undefined;
  token: string;
  appUrl: string;
}): URL {
  const { destination, token, appUrl } = params;
  const appBaseUrl = new URL(appUrl);

  if (!destination) {
    const fallbackUrl = new URL("/", appBaseUrl);
    fallbackUrl.searchParams.set("fpr", token);
    return fallbackUrl;
  }

  let parsedDestination: URL;

  try {
    parsedDestination = new URL(destination, appBaseUrl);
  } catch {
    const fallbackUrl = new URL("/", appBaseUrl);
    fallbackUrl.searchParams.set("fpr", token);
    return fallbackUrl;
  }

  if (isInternalPositivesHost(parsedDestination.hostname, appUrl)) {
    const internalUrl = new URL(
      `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`,
      appBaseUrl
    );
    internalUrl.searchParams.set("fpr", token);
    return internalUrl;
  }

  parsedDestination.searchParams.set("fpr", token);
  return parsedDestination;
}
