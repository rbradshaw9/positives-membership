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

function apiKey(): string {
  const key = process.env.FIRSTPROMOTER_API_KEY;
  if (!key) throw new Error("[FP] FIRSTPROMOTER_API_KEY env var is not set.");
  return key;
}

async function fpFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${FP_BASE}${path}`, {
    ...options,
    headers: {
      "x-api-key": apiKey(),
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[FP] ${options.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FpPromoter {
  id: number;
  ref_id: string;
  email: string;
  state: string;
  created_at: string;
  /** Populated when FP returns the parent promoter's info */
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
  status: "paid" | "unpaid" | "pending" | string;
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
  // Try to find existing promoter first
  try {
    const existing = await fpFetch<FpPromoter>(
      `/promoters?email=${encodeURIComponent(email)}`
    );
    if (existing?.id) {
      console.log(`[FP] Existing promoter found — email: ${email}, id: ${existing.id}`);
      return existing;
    }
  } catch {
    // 404 or not found — proceed to create
  }

  // Resolve parent promoter ID if we have their fpr ref_id
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
    } catch (err) {
      // Non-fatal: create promoter without parent if lookup fails
      console.warn(
        `[FP] Could not resolve parent promoter for refId: ${parentRefId}: ${err}. ` +
          `Proceeding without parent link.`
      );
    }
  }

  const body: Record<string, string | number> = {
    email,
    first_name: firstName,
    last_name: lastName,
  };

  if (ref_id) body.ref_id = ref_id;
  if (parentPromoterId) body.parent_promoter_id = parentPromoterId;

  const promoter = await fpFetch<FpPromoter>("/promoters", {
    method: "POST",
    body: JSON.stringify(body),
  });

  console.log(
    `[FP] Promoter created — email: ${email}, id: ${promoter.id}, ` +
      `ref_id: ${promoter.ref_id}${parentPromoterId ? `, parent: ${parentPromoterId}` : ""}`
  );

  return promoter;
}

/**
 * Find a promoter by their ?fpr= tracking code (ref_id).
 * Used to resolve the parent promoter ID when enrolling a new affiliate.
 */
export async function findPromoterByRefId(refId: string): Promise<FpPromoter | null> {
  try {
    const result = await fpFetch<FpPromoter>(
      `/promoters?ref_id=${encodeURIComponent(refId)}`
    );
    return result?.id ? result : null;
  } catch {
    return null;
  }
}

/**
 * Get a promoter by ID.
 */
export async function getPromoter(promoterId: number): Promise<FpPromoter> {
  return fpFetch<FpPromoter>(`/promoters/${promoterId}`);
}

/**
 * Get traffic/conversion stats for a promoter.
 * FP rolls these up on the promoter object itself.
 */
export async function getPromoterStats(promoterId: number): Promise<PromoterStats> {
  interface FpPromoterDetailed {
    visitors_count: number;
    leads_count: number;
    customers_count: number;
  }
  const p = await fpFetch<FpPromoterDetailed>(`/promoters/${promoterId}`);
  return {
    visitors:    p.visitors_count   ?? 0,
    leads:       p.leads_count      ?? 0,
    conversions: p.customers_count  ?? 0,
  };
}

/**
 * Get commissions (rewards) for a promoter.
 * FP calls these "rewards" in its API.
 */
export async function getPromoterCommissions(promoterId: number): Promise<AffiliateCommission[]> {
  interface FpReward {
    id: number;
    amount: number;
    status: string;
    created_at: string;
  }
  try {
    const results = await fpFetch<FpReward[]>(
      `/rewards?promoter_id=${promoterId}&per_page=50`
    );
    return (results ?? []).map((r) => ({
      id:         r.id,
      amount:     r.amount,
      status:     r.status,
      created_at: r.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Get payouts for a promoter.
 */
export async function getPromoterPayouts(promoterId: number): Promise<AffiliatePayout[]> {
  interface FpPayout {
    id: number;
    amount: number;
    state: string;
    created_at: string;
  }
  try {
    const results = await fpFetch<FpPayout[]>(
      `/payouts?promoter_id=${promoterId}&per_page=50`
    );
    return (results ?? []).map((p) => ({
      id:         p.id,
      amount:     p.amount,
      state:      p.state,
      created_at: p.created_at,
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
  await fpFetch("/conversions", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100), // FP expects cents
      plan_id: planId ?? undefined,
      ref_id: refId,
    }),
  });

  console.log(`[FP] Sale tracked — email: ${email}, amount: $${amount}, refId: ${refId}`);
}
