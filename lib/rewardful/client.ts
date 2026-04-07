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

export interface RewardfulAffiliate {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  state: "active" | "inactive";
  referral_token: string;
  created_at: string;
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
