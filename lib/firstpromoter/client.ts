/**
 * lib/firstpromoter/client.ts
 *
 * Thin client for the FirstPromoter REST API v1.
 *
 * Docs: https://docs.firstpromoter.com/
 *
 * All requests are authenticated via the FIRSTPROMOTER_API_KEY env var
 * (secret/private key — not the tracking script key).
 */

const FP_BASE = "https://firstpromoter.com/api/v1";

type Primitive = string | number | boolean | null | undefined;
type QueryValue = Primitive | Primitive[];

interface FpFetchOptions extends Omit<RequestInit, "body"> {
  query?: Record<string, QueryValue>;
}

export class FirstPromoterApiError extends Error {
  status: number;
  body: string;
  path: string;

  constructor(path: string, method: string, status: number, body: string) {
    super(`[FP] ${method} ${path} → ${status}: ${body}`);
    this.name = "FirstPromoterApiError";
    this.status = status;
    this.body = body;
    this.path = path;
  }
}

function apiKey(): string {
  const key = process.env.FIRSTPROMOTER_API_KEY;
  if (!key) throw new Error("[FP] FIRSTPROMOTER_API_KEY env var is not set.");
  return key;
}

function appendQuery(url: URL, query?: Record<string, QueryValue>) {
  if (!query) return;

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined || item === "") continue;
        url.searchParams.append(key, String(item));
      }
      continue;
    }

    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }
}

async function fpFetch<T>(
  path: string,
  { query, headers, method = "GET", ...options }: FpFetchOptions = {}
): Promise<T> {
  const url = new URL(`${FP_BASE}${path}`);
  appendQuery(url, query);

  const res = await fetch(url.toString(), {
    ...options,
    method,
    headers: {
      "X-API-KEY": apiKey(),
      Accept: "application/json",
      ...(headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new FirstPromoterApiError(path, method, res.status, text);
  }

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FpPromoter {
  id: number;
  ref_id: string;
  email: string;
  state: string;
  created_at: string;
  auth_token?: string;
  promoter?: {
    id: number;
    ref_id: string;
  };
}

/** Platform-agnostic commission record (mapped from FP's reward object). */
export interface AffiliateCommission {
  id: string | number;
  /** Amount in cents */
  amount: number;
  status: "paid" | "unpaid" | "pending" | "approved" | string;
  created_at: string;
  /** Email of the referred member who generated this commission */
  customer_email?: string;
}

/** Platform-agnostic payout record. */
export interface AffiliatePayout {
  id: string | number;
  /** Amount in cents */
  amount: number;
  state: "paid" | "processing" | "due" | "pending" | string;
  created_at: string;
}

/** Platform-agnostic traffic/conversion stats for a promoter. */
export interface PromoterStats {
  visitors: number;
  leads: number;
  conversions: number;
}

interface FpPromotionStats {
  ref_id?: string;
  visitors_count?: number;
  leads_count?: number;
  customers_count?: number;
}

interface FpPromoterResponse {
  id: number;
  email: string;
  status?: string;
  state?: string;
  created_at: string;
  default_ref_id?: string;
  ref_id?: string;
  auth_token?: string;
  pref?: string;
  parent_promoter_id?: number | string | null;
  parent_promoter?: {
    id?: number;
    default_ref_id?: string;
    ref_id?: string;
  } | null;
  promotions?: FpPromotionStats[];
  visitors_count?: number;
  leads_count?: number;
  customers_count?: number;
}

interface FpRewardResponse {
  id: number;
  amount?: number;
  conversion_amount?: number;
  status?: string;
  state?: string;
  created_at: string;
  lead?: {
    email?: string;
  } | null;
}

interface FpPayoutResponse {
  id: number;
  amount?: number;
  total_amount?: number;
  state?: string;
  status?: string;
  created_at: string;
}

interface FpCollectionResponse<T> {
  items?: T[];
  data?: T[];
}

function normalizePromoter(raw: FpPromoterResponse): FpPromoter {
  const refId =
    raw.ref_id ??
    raw.default_ref_id ??
    raw.promotions?.find((promotion) => promotion.ref_id)?.ref_id ??
    raw.pref ??
    "";

  const parentRefId =
    raw.parent_promoter?.ref_id ?? raw.parent_promoter?.default_ref_id ?? undefined;

  return {
    id: raw.id,
    ref_id: refId,
    email: raw.email,
    state: raw.state ?? raw.status ?? "active",
    created_at: raw.created_at,
    auth_token: raw.auth_token,
    promoter:
      raw.parent_promoter?.id && parentRefId
        ? { id: raw.parent_promoter.id, ref_id: parentRefId }
        : undefined,
  };
}

function normalizeCollection<T>(payload: T[] | FpCollectionResponse<T> | null | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function normalizeCommissionStatus(status: string | undefined): AffiliateCommission["status"] {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
      return "paid";
    case "approved":
      return "approved";
    case "pending":
      return "pending";
    default:
      return status ?? "pending";
  }
}

function normalizePayoutState(state: string | undefined): AffiliatePayout["state"] {
  switch ((state ?? "").toLowerCase()) {
    case "paid":
      return "paid";
    case "processing":
      return "processing";
    case "due":
      return "due";
    default:
      return state ?? "pending";
  }
}

async function showPromoter(query: Record<string, QueryValue>): Promise<FpPromoterResponse> {
  return fpFetch<FpPromoterResponse>("/promoters/show", { query });
}

async function listPromoters(query: Record<string, QueryValue>): Promise<FpPromoterResponse[]> {
  const payload = await fpFetch<FpPromoterResponse[] | FpCollectionResponse<FpPromoterResponse>>(
    "/promoters/list",
    { query }
  );

  return normalizeCollection(payload);
}

export function isFirstPromoterAuthError(error: unknown): boolean {
  return (
    error instanceof FirstPromoterApiError &&
    (error.status === 401 || /bad credentials/i.test(error.body))
  );
}

// ── Create or find a promoter ──────────────────────────────────────────────────

/**
 * Create a promoter in FP, or return the existing one if already present.
 *
 * @param email         Member's email
 * @param ref_id        Custom slug / referral code (e.g. "ryan-level-1")
 * @param parentRefId   Optional: the ?fpr= code that originally referred this
 *                      member. When provided, FP links this promoter as a
 *                      "child" of the parent, enabling the override commission.
 *                      This is the permanent genealogy link — not cookie-based.
 */
export async function ensureFpPromoter({
  email,
  firstName,
  lastName,
  ref_id,
  parentRefId,
}: {
  email: string;
  firstName: string;
  lastName: string;
  ref_id?: string;
  parentRefId?: string | null;
}): Promise<FpPromoter> {
  try {
    const existing = await showPromoter({ promoter_email: email });
    if (existing?.id) {
      console.log(`[FP] Existing promoter found — email: ${email}, id: ${existing.id}`);
      return normalizePromoter(existing);
    }
  } catch (error) {
    if (error instanceof FirstPromoterApiError && error.status !== 404) {
      throw error;
    }
  }

  let parentPromoterId: number | undefined;
  if (parentRefId) {
    try {
      const parent = await findPromoterByRefId(parentRefId);
      if (parent?.id) {
        parentPromoterId = parent.id;
        console.log(
          `[FP] Linking new promoter to parent — parentRefId: ${parentRefId}, parentPromoterId: ${parentPromoterId}`
        );
      }
    } catch (error) {
      console.warn(
        `[FP] Could not resolve parent promoter for refId: ${parentRefId}: ${error}. Proceeding without parent link.`
      );
    }
  }

  const created = await fpFetch<FpPromoterResponse>("/promoters/create", {
    method: "POST",
    query: {
      email,
      first_name: firstName,
      last_name: lastName,
      ref_id,
      parent_promoter_id: parentPromoterId,
    },
  });

  const promoter = normalizePromoter(created);

  console.log(
    `[FP] Promoter created — email: ${email}, id: ${promoter.id}, ref_id: ${promoter.ref_id}${parentPromoterId ? `, parent: ${parentPromoterId}` : ""}`
  );

  return promoter;
}

/**
 * Find a promoter by their ?fpr= tracking code (ref_id).
 * Used to resolve the parent promoter ID when enrolling a new affiliate.
 */
export async function findPromoterByRefId(refId: string): Promise<FpPromoter | null> {
  try {
    const result = await showPromoter({ ref_id: refId });
    return result?.id ? normalizePromoter(result) : null;
  } catch (error) {
    if (error instanceof FirstPromoterApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get a promoter by ID.
 */
export async function getPromoter(promoterId: number): Promise<FpPromoter> {
  return normalizePromoter(await showPromoter({ id: promoterId }));
}

export async function updatePromoterRefId(
  promoterId: number,
  refId: string
): Promise<FpPromoter> {
  const promoter = await fpFetch<FpPromoterResponse>("/promoters/update", {
    method: "PUT",
    query: {
      id: promoterId,
      ref_id: refId,
    },
  });

  return normalizePromoter(promoter);
}

/**
 * Get traffic/conversion stats for a promoter.
 */
export async function getPromoterStats(promoterId: number): Promise<PromoterStats> {
  const promoter = await showPromoter({ id: promoterId });
  const promotions = promoter.promotions ?? [];

  const rolledUp = promotions.reduce(
    (totals, promotion) => ({
      visitors: totals.visitors + (promotion.visitors_count ?? 0),
      leads: totals.leads + (promotion.leads_count ?? 0),
      conversions: totals.conversions + (promotion.customers_count ?? 0),
    }),
    { visitors: 0, leads: 0, conversions: 0 }
  );

  return {
    visitors: rolledUp.visitors || promoter.visitors_count || 0,
    leads: rolledUp.leads || promoter.leads_count || 0,
    conversions: rolledUp.conversions || promoter.customers_count || 0,
  };
}

/**
 * Get commissions (rewards) for a promoter.
 * FP calls these "rewards" in its API.
 */
export async function getPromoterCommissions(
  promoterId: number
): Promise<AffiliateCommission[]> {
  try {
    const payload = await fpFetch<
      FpRewardResponse[] | FpCollectionResponse<FpRewardResponse>
    >("/rewards/list", {
      query: {
        promoter_id: promoterId,
        per_page: 50,
      },
    });

    return normalizeCollection(payload).map((reward) => ({
      id: reward.id,
      amount: reward.amount ?? reward.conversion_amount ?? 0,
      status: normalizeCommissionStatus(reward.status ?? reward.state),
      created_at: reward.created_at,
      customer_email: reward.lead?.email ?? undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Get payouts for a promoter.
 */
export async function getPromoterPayouts(promoterId: number): Promise<AffiliatePayout[]> {
  try {
    const payload = await fpFetch<
      FpPayoutResponse[] | FpCollectionResponse<FpPayoutResponse>
    >("/payouts/list", {
      query: {
        promoter_id: promoterId,
        per_page: 50,
      },
    });

    return normalizeCollection(payload).map((payout) => ({
      id: payout.id,
      amount: payout.amount ?? payout.total_amount ?? 0,
      state: normalizePayoutState(payout.state ?? payout.status),
      created_at: payout.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Track a sale/conversion in FP.
 *
 * Called after a successful checkout when the session carried a ?fpr= referral.
 * FP will credit the referring promoter and apply override commissions up the chain.
 *
 * @param email     The purchaser's email (lead identifier)
 * @param amount    Sale amount in dollars (not cents)
 * @param planId    Optional: the Stripe price ID as an external ref for reporting
 * @param refId     The ?fpr= code that the buyer arrived with (from session metadata)
 */
export async function trackFpSale({
  email,
  amount,
  planId,
  refId,
}: {
  email: string;
  amount: number;
  planId?: string;
  refId: string;
}): Promise<void> {
  await fpFetch("/track/sale", {
    method: "POST",
    query: {
      email,
      amount: Math.round(amount * 100),
      plan: planId,
      ref_id: refId,
    },
  });

  console.log(`[FP] Sale tracked — email: ${email}, amount: $${amount}, refId: ${refId}`);
}

export async function listPromotersByEmail(email: string): Promise<FpPromoter[]> {
  const promoters = await listPromoters({ promoter_email: email, per_page: 10 });
  return promoters.map(normalizePromoter);
}
