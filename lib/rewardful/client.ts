/**
 * lib/rewardful/client.ts
 *
 * Thin server-side wrapper around the Rewardful REST API.
 * Auth: HTTP Basic with the API secret as the username, empty password.
 *
 * Rewardful's Stripe integration auto-detects conversions using
 * client_reference_id on the checkout session. No explicit conversion
 * API call is needed — Rewardful listens to Stripe webhooks directly.
 *
 * This client is used for:
 * - Fetching affiliate data for reporting / admin views
 * - Enriching AC contacts with affiliate metadata
 */

const BASE_URL = "https://api.getrewardful.com/v1";

function getAuthHeader(): string {
  const secret = process.env.REWARDFUL_API_SECRET;
  if (!secret) {
    throw new Error("[Rewardful] REWARDFUL_API_SECRET is not set");
  }
  return "Basic " + Buffer.from(`${secret}:`).toString("base64");
}

async function rewardfulFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[Rewardful] ${res.status} ${path} — ${body}`);
  }

  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface RewardfulAffiliateLink {
  id: string;
  url: string;
  token: string;  // this is the referral token, e.g. "ryan" → positives.life?via=ryan
  visitors: number;
  leads: number;
  conversions: number;
}

export interface RewardfulAffiliate {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  paypal_email: string | null;
  state: "active" | "inactive";
  /**
   * Rewardful stores the token under links[0].token, NOT referral_token.
   * Use getReferralToken(affiliate) to safely extract it.
   */
  links: RewardfulAffiliateLink[];
  created_at: string;
}

/**
 * Safely extract the primary referral token from an affiliate.
 * Rewardful puts it at links[0].token, not at the top level.
 */
export function getReferralToken(affiliate: RewardfulAffiliate): string {
  return affiliate.links?.[0]?.token ?? "";
}

export interface RewardfulReferral {
  id: string;
  affiliate: RewardfulAffiliate;
  conversion_state: "lead" | "conversion";
  stripe_customer_id: string | null;
  created_at: string;
}

// ── API Methods ────────────────────────────────────────────────────────────

/**
 * Retrieve a single affiliate by their Rewardful ID.
 */
export async function getAffiliate(id: string): Promise<RewardfulAffiliate> {
  return rewardfulFetch<RewardfulAffiliate>(`/affiliates/${id}`);
}

/**
 * List affiliates (paginated, page 1 by default).
 */
export async function listAffiliates(
  page = 1
): Promise<{ data: RewardfulAffiliate[] }> {
  return rewardfulFetch<{ data: RewardfulAffiliate[] }>(
    `/affiliates?page=${page}&expand[]=campaign`
  );
}

/**
 * List referrals, optionally filtered by Stripe customer ID.
 * Useful for looking up which affiliate referred a member post-checkout.
 */
export async function getReferralByStripeCustomer(
  stripeCustomerId: string
): Promise<RewardfulReferral | null> {
  type ListResponse = {
    data: RewardfulReferral[];
    pagination: { total_count: number };
  };

  const result = await rewardfulFetch<ListResponse>(
    `/referrals?stripe_customer_id=${stripeCustomerId}&expand[]=affiliate`
  );

  return result.data[0] ?? null;
}

/**
 * Find an existing affiliate by email address.
 * Returns null if not found (does not throw on 404).
 */
export async function getAffiliateByEmail(
  email: string
): Promise<RewardfulAffiliate | null> {
  type ListResponse = { data: RewardfulAffiliate[] };
  try {
    const result = await rewardfulFetch<ListResponse>(
      `/affiliates?email=${encodeURIComponent(email)}&expand[]=campaign`
    );
    return result.data[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a new affiliate account in Rewardful.
 * Rewardful sends them a welcome email automatically.
 */
export async function createAffiliate(params: {
  email: string;
  first_name: string;
  last_name: string;
}): Promise<RewardfulAffiliate> {
  const body = new URLSearchParams({
    email: params.email,
    first_name: params.first_name,
    last_name: params.last_name || "—",
  });

  return rewardfulFetch<RewardfulAffiliate>("/affiliates", {
    method: "POST",
    body: body.toString(),
  });
}

/**
 * Idempotent: returns existing affiliate or creates a new one.
 * Safe to call on every "Get my referral link" click.
 *
 * Returns the affiliate object with their referral_token (for shareable links)
 * and id (for SSO calls). Both should be cached on the member row.
 *
 * positives.life?via={referral_token}
 */
export async function ensureAffiliate(params: {
  email: string;
  first_name: string;
  last_name: string;
}): Promise<RewardfulAffiliate> {
  const existing = await getAffiliateByEmail(params.email);
  if (existing) {
    // The list endpoint omits links[] — fetch by ID to get the full object
    // including links[0].token which we need for the referral URL.
    return getAffiliate(existing.id);
  }
  return createAffiliate(params);
}

/**
 * Generate a one-time magic link (SSO) for an affiliate to auto-login
 * to their Rewardful dashboard. Links expire in ~60 seconds.
 *
 * ⚠️  Never store or embed this URL — generate on-demand and redirect immediately.
 *
 * Requires Growth plan — the branded portal must be enabled for the link to work.
 */
export async function getAffiliateSSO(
  affiliateId: string
): Promise<{ url: string; expires: string }> {
  const res = await rewardfulFetch<{
    sso: { url: string; expires: string };
    affiliate: { id: string; email: string };
  }>(`/affiliates/${affiliateId}/sso`);
  return res.sso;
}

// ── Commissions ─────────────────────────────────────────────────────────────

export interface RewardfulCommission {
  id: string;
  amount: number;         // in cents
  currency: string;
  status: "pending" | "unpaid" | "paid";
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
  referral: {
    id: string;
    conversion_state: "lead" | "conversion";
    stripe_customer_id: string | null;
  };
}

/**
 * List commissions for a specific affiliate.
 * Returns up to 100 most recent commissions.
 */
export async function getAffiliateCommissions(
  affiliateId: string
): Promise<RewardfulCommission[]> {
  type Response = {
    data: RewardfulCommission[];
    pagination: { total_count: number };
  };
  try {
    const result = await rewardfulFetch<Response>(
      `/commissions?affiliate_id=${affiliateId}&limit=100&expand[]=referral`
    );
    return result.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Update the PayPal payout email for an affiliate.
 * PUT /v1/affiliates/:id  →  paypal_email=…
 */
export async function updateAffiliatePayPal(
  affiliateId: string,
  paypalEmail: string
): Promise<RewardfulAffiliate> {
  const body = new URLSearchParams({ paypal_email: paypalEmail });
  return rewardfulFetch<RewardfulAffiliate>(`/affiliates/${affiliateId}`, {
    method: "PUT",
    body: body.toString(),
  });
}

