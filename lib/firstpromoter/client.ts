/**
 * lib/firstpromoter/client.ts
 *
 * Thin client for the FirstPromoter REST API v2.
 *
 * Docs: https://docs.firstpromoter.com/
 *
 * Admin requests use:
 *   - Authorization: Bearer <FIRSTPROMOTER_API_KEY>
 *   - Account-ID: <FIRSTPROMOTER_ACCOUNT_ID>
 */

const FP_BASE = "https://api.firstpromoter.com/api/v2";

type Primitive = string | number | boolean | null | undefined;
type QueryValue = Primitive | Primitive[];

interface FpFetchOptions extends Omit<RequestInit, "body"> {
  query?: Record<string, QueryValue>;
  json?: unknown;
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

function accountId(): string {
  const id =
    process.env.FIRSTPROMOTER_ACCOUNT_ID ??
    process.env.NEXT_PUBLIC_FIRSTPROMOTER_ACCOUNT_ID;
  if (!id) throw new Error("[FP] FIRSTPROMOTER_ACCOUNT_ID env var is not set.");
  return id;
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
  { query, json, headers, method = "GET", ...options }: FpFetchOptions = {}
): Promise<T> {
  const url = new URL(`${FP_BASE}${path}`);
  appendQuery(url, query);

  const res = await fetch(url.toString(), {
    ...options,
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Account-ID": accountId(),
      Accept: "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new FirstPromoterApiError(path, method, res.status, text);
  }

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export interface FpPromoter {
  id: number;
  ref_id: string;
  email: string;
  state: string;
  created_at: string;
  promoterCampaignId?: number;
  referralLink?: string;
  passwordSetupUrl?: string | null;
  promoter?: {
    id: number;
  };
}

export interface AffiliateCommission {
  id: string | number;
  amount: number;
  status: "paid" | "unpaid" | "pending" | "approved" | string;
  created_at: string;
  customer_email?: string;
}

export interface AffiliatePayout {
  id: string | number;
  amount: number;
  state: "paid" | "processing" | "due" | "pending" | string;
  created_at: string;
}

export interface PromoterStats {
  visitors: number;
  leads: number;
  conversions: number;
}

export interface PromoterTrendPoint {
  period: string;
  visitors: number;
  leads: number;
  conversions: number;
  earnings: number;
}

export interface PromoterUrlReport {
  id: string;
  url: string;
  clicks: number;
  leads: number;
  conversions: number;
  earnings: number;
}

interface FpStats {
  clicks_count?: number;
  referrals_count?: number;
  customers_count?: number;
  sales_count?: number;
  revenue_amount?: number;
}

interface FpPromoterCampaign {
  id: number;
  campaign_id: number;
  promoter_id: number;
  state?: string;
  created_at?: string;
  ref_token?: string;
  ref_link?: string;
  campaign?: {
    id: number;
    name?: string;
    color?: string;
  } | null;
}

interface FpPromoterResponse {
  id: number;
  email: string;
  state?: string;
  created_at: string;
  password_setup_url?: string | null;
  stats?: FpStats | null;
  promoter_campaigns?: FpPromoterCampaign[];
  parent_promoter?: {
    id: number;
    email?: string;
    name?: string;
  } | null;
}

interface FpCommissionResponse {
  id: number;
  amount?: number;
  conversion_amount?: number;
  state?: string;
  status?: string;
  created_at: string;
  referral?: {
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

interface FpPromoterReportRow {
  id: number | string;
  promoter?: {
    id?: number;
    email?: string;
    name?: string;
  } | null;
  data?: {
    clicks_count?: number;
    referrals_count?: number;
    customers_count?: number;
    promoter_earnings_amount?: number;
  } | null;
  sub_data?: Array<{
    period?: string;
    id?: string;
    data?: {
      clicks_count?: number;
      referrals_count?: number;
      customers_count?: number;
      promoter_earnings_amount?: number;
    } | null;
  }> | null;
}

interface FpUrlReportRow {
  id: string;
  url?: string | null;
  data?: {
    clicks_count?: number;
    referrals_count?: number;
    customers_count?: number;
    promoter_earnings_amount?: number;
  } | null;
}

function primaryCampaign(
  promoter: FpPromoterResponse,
  campaignId?: number | null
): FpPromoterCampaign | undefined {
  if (!promoter.promoter_campaigns?.length) return undefined;
  if (campaignId) {
    const match = promoter.promoter_campaigns.find((item) => item.campaign_id === campaignId);
    if (match) return match;
  }
  return promoter.promoter_campaigns[0];
}

function normalizePromoter(raw: FpPromoterResponse, campaignId?: number | null): FpPromoter {
  const campaign = primaryCampaign(raw, campaignId);

  return {
    id: raw.id,
    ref_id: campaign?.ref_token ?? "",
    email: raw.email,
    state: campaign?.state ?? raw.state ?? "pending",
    created_at: raw.created_at,
    promoterCampaignId: campaign?.id,
    referralLink: campaign?.ref_link ?? undefined,
    passwordSetupUrl: raw.password_setup_url ?? null,
    promoter: raw.parent_promoter?.id ? { id: raw.parent_promoter.id } : undefined,
  };
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

export function isFirstPromoterAuthError(error: unknown): boolean {
  return (
    error instanceof FirstPromoterApiError &&
    (error.status === 401 || /unauthorized|bad credentials/i.test(error.body))
  );
}

async function getPromoterDetailsByIdentifier(
  identifier: string | number,
  findBy?: "email" | "ref_token" | "auth_token" | "promo_code"
): Promise<FpPromoterResponse> {
  return fpFetch<FpPromoterResponse>(`/company/promoters/${encodeURIComponent(String(identifier))}`, {
    query: {
      ...(findBy ? { find_by: findBy } : {}),
      include_parent_promoter: true,
    },
  });
}

async function getDefaultCampaignId(): Promise<number> {
  const explicit = process.env.FIRSTPROMOTER_CAMPAIGN_ID;
  if (explicit && /^\d+$/.test(explicit)) return Number(explicit);

  const campaigns = await fpFetch<FpPromoterCampaign[]>("/company/promoter_campaigns");
  const positivesCampaign =
    campaigns.find((item) => item.campaign?.name === "Positives Affiliate Program") ?? campaigns[0];

  if (!positivesCampaign?.campaign_id) {
    throw new Error("[FP] Could not determine a default campaign ID.");
  }

  return positivesCampaign.campaign_id;
}

async function addPromoterToCampaign(promoterId: number, campaignId: number): Promise<void> {
  await fpFetch("/company/promoters/add_to_campaign", {
    method: "POST",
    json: {
      campaign_id: campaignId,
      ids: [promoterId],
    },
  });
}

async function acceptPromoter(promoterId: number, campaignId: number): Promise<void> {
  await fpFetch("/company/promoters/accept", {
    method: "POST",
    json: {
      campaign_id: campaignId,
      ids: [promoterId],
    },
  });
}

async function assignParentPromoter(promoterId: number, parentPromoterId: number): Promise<void> {
  await fpFetch("/company/promoters/assign_parent", {
    method: "POST",
    json: {
      parent_promoter_id: parentPromoterId,
      ids: [promoterId],
    },
  });
}

async function ensureCampaignMembership(
  promoter: FpPromoterResponse,
  campaignId: number
): Promise<FpPromoterResponse> {
  const campaign = primaryCampaign(promoter, campaignId);
  if (!campaign) {
    await addPromoterToCampaign(promoter.id, campaignId);
    return getPromoterDetailsByIdentifier(promoter.id);
  }
  return promoter;
}

async function ensureAcceptedPromoter(
  promoter: FpPromoterResponse,
  campaignId: number
): Promise<FpPromoterResponse> {
  const campaign = primaryCampaign(promoter, campaignId);
  if (!campaign) return promoter;

  if (campaign.state === "accepted") return promoter;

  await acceptPromoter(promoter.id, campaignId);
  return getPromoterDetailsByIdentifier(promoter.id);
}

export async function findPromoterByRefId(refId: string): Promise<FpPromoter | null> {
  try {
    const promoter = await getPromoterDetailsByIdentifier(refId, "ref_token");
    return normalizePromoter(promoter);
  } catch (error) {
    if (error instanceof FirstPromoterApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getPromoter(promoterId: number): Promise<FpPromoter> {
  const campaignId = await getDefaultCampaignId();
  return normalizePromoter(await getPromoterDetailsByIdentifier(promoterId), campaignId);
}

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
  const campaignId = await getDefaultCampaignId();

  let promoter: FpPromoterResponse;

  try {
    promoter = await getPromoterDetailsByIdentifier(email, "email");
    console.log(`[FP] Existing promoter found — email: ${email}, id: ${promoter.id}`);
  } catch (error) {
    if (!(error instanceof FirstPromoterApiError) || error.status !== 404) {
      throw error;
    }

    promoter = await fpFetch<FpPromoterResponse>("/company/promoters", {
      method: "POST",
      json: {
        email,
        profile: {
          first_name: firstName,
          last_name: lastName,
        },
        initial_campaign_id: campaignId,
        drip_emails: true,
      },
    });

    console.log(`[FP] Promoter created — email: ${email}, id: ${promoter.id}`);
  }

  promoter = await ensureCampaignMembership(promoter, campaignId);
  promoter = await ensureAcceptedPromoter(promoter, campaignId);

  if (ref_id) {
    const current = normalizePromoter(promoter, campaignId);
    if (current.ref_id && current.ref_id !== ref_id) {
      promoter = await (async () => {
        const updated = await updatePromoterRefId(promoter.id, ref_id);
        return getPromoterDetailsByIdentifier(updated.id);
      })();
    }
  }

  if (parentRefId) {
    const parent = await findPromoterByRefId(parentRefId);
    if (parent?.id && promoter.id !== parent.id && promoter.parent_promoter?.id !== parent.id) {
      await assignParentPromoter(promoter.id, parent.id);
      promoter = await getPromoterDetailsByIdentifier(promoter.id);
    }
  }

  return normalizePromoter(promoter, campaignId);
}

export async function updatePromoterRefId(
  promoterId: number,
  refId: string
): Promise<FpPromoter> {
  const promoter = await getPromoterDetailsByIdentifier(promoterId);
  const campaign = primaryCampaign(promoter);

  if (!campaign?.id) {
    throw new Error("[FP] No promoter campaign found for slug update.");
  }

  await fpFetch(`/company/promoter_campaigns/${campaign.id}`, {
    method: "PUT",
    json: {
      ref_token: refId,
    },
  });

  return normalizePromoter(await getPromoterDetailsByIdentifier(promoterId), campaign.campaign_id);
}

export async function getPromoterStats(promoterId: number): Promise<PromoterStats> {
  const promoter = await getPromoterDetailsByIdentifier(promoterId);
  const stats = promoter.stats ?? {};
  return {
    visitors: stats.clicks_count ?? 0,
    leads: stats.referrals_count ?? 0,
    conversions: stats.customers_count ?? 0,
  };
}

export async function getPromoterCommissions(promoterId: number): Promise<AffiliateCommission[]> {
  try {
    const commissions = await fpFetch<FpCommissionResponse[]>("/company/commissions", {
      query: {
        "filters[promoter_id]": promoterId,
      },
    });

    return commissions.map((commission) => ({
      id: commission.id,
      amount: commission.amount ?? commission.conversion_amount ?? 0,
      status: normalizeCommissionStatus(commission.status ?? commission.state),
      created_at: commission.created_at,
      customer_email: commission.referral?.email ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function getPromoterPayouts(promoterId: number): Promise<AffiliatePayout[]> {
  try {
    const payouts = await fpFetch<FpPayoutResponse[]>("/company/payouts", {
      query: {
        "filters[promoter_id]": promoterId,
      },
    });

    return payouts.map((payout) => ({
      id: payout.id,
      amount: payout.amount ?? payout.total_amount ?? 0,
      state: normalizePayoutState(payout.state ?? payout.status),
      created_at: payout.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getPromoterTrendReport(input: {
  promoterId?: number;
  email?: string | null;
  startDate: string;
  endDate: string;
  groupBy?: "day" | "week" | "month" | "year";
}): Promise<PromoterTrendPoint[]> {
  const rows = await fpFetch<FpPromoterReportRow[]>("/company/reports/promoters", {
    query: {
      columns: [
        "clicks_count",
        "referrals_count",
        "customers_count",
        "promoter_earnings_amount",
      ],
      group_by: input.groupBy ?? "month",
      start_date: input.startDate,
      end_date: input.endDate,
    },
  });

  const match = rows.find((row) => {
    if (input.promoterId && row.promoter?.id === input.promoterId) return true;
    if (input.email && row.promoter?.email?.toLowerCase() === input.email.toLowerCase()) return true;
    return false;
  });

  return (match?.sub_data ?? []).map((point) => ({
    period: point.period ?? point.id ?? "",
    visitors: point.data?.clicks_count ?? 0,
    leads: point.data?.referrals_count ?? 0,
    conversions: point.data?.customers_count ?? 0,
    earnings: point.data?.promoter_earnings_amount ?? 0,
  }));
}

export async function getPromoterUrlReports(input: {
  query: string;
  startDate: string;
  endDate: string;
  groupBy?: "day" | "week" | "month" | "year";
}): Promise<PromoterUrlReport[]> {
  const rows = await fpFetch<FpUrlReportRow[]>("/company/reports/urls", {
    query: {
      columns: [
        "clicks_count",
        "referrals_count",
        "customers_count",
        "promoter_earnings_amount",
        "url",
      ],
      q: input.query,
      group_by: input.groupBy ?? "month",
      start_date: input.startDate,
      end_date: input.endDate,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    url: row.url ?? "",
    clicks: row.data?.clicks_count ?? 0,
    leads: row.data?.referrals_count ?? 0,
    conversions: row.data?.customers_count ?? 0,
    earnings: row.data?.promoter_earnings_amount ?? 0,
  }));
}

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
    json: {
      email,
      amount: Math.round(amount * 100),
      plan: planId,
      ref_id: refId,
    },
  });

  console.log(`[FP] Sale tracked — email: ${email}, amount: $${amount}, refId: ${refId}`);
}

export async function listPromotersByEmail(email: string): Promise<FpPromoter[]> {
  try {
    const promoter = await getPromoterDetailsByIdentifier(email, "email");
    return [normalizePromoter(promoter)];
  } catch (error) {
    if (error instanceof FirstPromoterApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}
