type PublicSearchParamValue = string | string[] | undefined;

export type PublicSearchParams = Record<string, PublicSearchParamValue>;

const PRESERVED_PUBLIC_QUERY_KEYS = new Set([
  "fpr",
  "ref",
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

export function appendPublicTrackingParams(
  href: string,
  searchParams?: PublicSearchParams
) {
  if (!searchParams || href.startsWith("/today") || href.startsWith("/login")) {
    return href;
  }

  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (!PRESERVED_PUBLIC_QUERY_KEYS.has(key) || rawValue == null) continue;

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        if (value) params.append(key, value);
      }
      continue;
    }

    if (rawValue) {
      params.set(key, rawValue);
    }
  }

  const query = params.toString();
  if (!query) return href;

  return `${href}${href.includes("?") ? "&" : "?"}${query}`;
}
