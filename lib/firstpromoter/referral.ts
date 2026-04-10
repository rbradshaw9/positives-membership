export const FIRST_PROMOTER_QUERY_PARAM = "fpr";
export const FIRST_PROMOTER_STORAGE_KEY = "positives:firstpromoter:fpr";
export const FIRST_PROMOTER_FIRST_PARTY_COOKIE = "positives_fpr";
export const FIRST_PROMOTER_COMPAT_COOKIE_NAMES = [
  FIRST_PROMOTER_FIRST_PARTY_COOKIE,
  "_fprom_ref",
  "_fprom_track",
] as const;

const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function readCookieValue(name: string) {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];

  return cookie ? decodeURIComponent(cookie) : null;
}

export function getStoredFirstPromoterRefId() {
  if (typeof window === "undefined") {
    return null;
  }

  const urlParam = new URLSearchParams(window.location.search).get(
    FIRST_PROMOTER_QUERY_PARAM
  );
  if (urlParam) {
    return urlParam;
  }

  const stored = window.localStorage.getItem(FIRST_PROMOTER_STORAGE_KEY);
  if (stored) {
    return stored;
  }

  for (const cookieName of FIRST_PROMOTER_COMPAT_COOKIE_NAMES) {
    const value = readCookieValue(cookieName);
    if (value) {
      return value;
    }
  }

  return null;
}

export function persistFirstPromoterRefId(refId: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const normalized = refId.trim();
  if (!normalized) return;

  window.localStorage.setItem(FIRST_PROMOTER_STORAGE_KEY, normalized);
  document.cookie = `${FIRST_PROMOTER_FIRST_PARTY_COOKIE}=${encodeURIComponent(
    normalized
  )}; path=/; max-age=${REFERRAL_COOKIE_MAX_AGE}; samesite=lax`;
}
