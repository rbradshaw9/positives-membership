import type {
  AffiliateCommission,
  AffiliatePayout,
  PromoterStats,
  PromoterTrendPoint,
  PromoterUrlReport,
} from "@/lib/firstpromoter/client";

export interface LegacyAffiliateLinkSummary {
  id: string;
  code: string;
  label: string;
  destination: string | null;
  clicks: number;
}

export interface AffiliatePortalTrendPoint {
  label: string;
  value: number;
}

export interface AffiliatePortalSource {
  id: string;
  label: string;
  detail: string;
  clicks: number;
  leads: number;
  members: number;
  earnings: number;
}

export interface AffiliatePortalViewModel {
  visitors: number;
  leads: number;
  members: number;
  conversionRate: number;
  totalPaid: number;
  totalPending: number;
  totalEarned: number;
  lastPayoutDate: string | null;
  payoutReady: boolean;
  momentumTitle: string;
  momentumBody: string;
  milestoneLabel: string;
  milestoneValue: string;
  milestoneProgress: number;
  nextActionTitle: string;
  nextActionBody: string;
  earningsTrend: AffiliatePortalTrendPoint[];
  membersTrend: AffiliatePortalTrendPoint[];
  topSources: AffiliatePortalSource[];
}

function formatTrendLabel(period: string) {
  if (!period) return "";

  const parsed = new Date(period);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  }

  return period;
}

function buildFallbackTrend(
  commissions: AffiliateCommission[],
  valueSelector: (items: AffiliateCommission[]) => number
): AffiliatePortalTrendPoint[] {
  const monthMap = new Map<string, AffiliateCommission[]>();

  for (const commission of commissions) {
    const date = new Date(commission.created_at);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const bucket = monthMap.get(key) ?? [];
    bucket.push(commission);
    monthMap.set(key, bucket);
  }

  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([period, items]) => ({
      label: formatTrendLabel(period),
      value: valueSelector(items),
    }));
}

function buildTrend(
  report: PromoterTrendPoint[] | null,
  commissions: AffiliateCommission[],
  valueSelector: (point: PromoterTrendPoint) => number,
  commissionFallback: (items: AffiliateCommission[]) => number
): AffiliatePortalTrendPoint[] {
  if (report?.length) {
    return report.slice(-6).map((point) => ({
      label: formatTrendLabel(point.period),
      value: valueSelector(point),
    }));
  }

  return buildFallbackTrend(commissions, commissionFallback);
}

function parseUrlSource(urlString: string) {
  try {
    const url = new URL(urlString);
    const subId = url.searchParams.get("sub_id")?.trim();
    const detail = url.hostname.replace(/^www\./, "") + url.pathname;

    if (subId) {
      return {
        key: `sub:${subId}`,
        label: subId,
        detail,
      };
    }

    return {
      key: `url:${detail}`,
      label: url.pathname === "/" ? "Homepage link" : url.pathname,
      detail,
    };
  } catch {
    return {
      key: `url:${urlString}`,
      label: urlString,
      detail: "Tracked URL",
    };
  }
}

function buildTopSources(input: {
  urlReports: PromoterUrlReport[];
  legacyLinks: LegacyAffiliateLinkSummary[];
}): AffiliatePortalSource[] {
  const sourceMap = new Map<string, AffiliatePortalSource>();

  for (const report of input.urlReports) {
    if (!report.url) continue;
    const parsed = parseUrlSource(report.url);
    const current = sourceMap.get(parsed.key) ?? {
      id: parsed.key,
      label: parsed.label,
      detail: parsed.detail,
      clicks: 0,
      leads: 0,
      members: 0,
      earnings: 0,
    };

    current.clicks += report.clicks;
    current.leads += report.leads;
    current.members += report.conversions;
    current.earnings += report.earnings;
    sourceMap.set(parsed.key, current);
  }

  for (const link of input.legacyLinks) {
    const key = `legacy:${link.id}`;
    const existing = sourceMap.get(key);
    sourceMap.set(key, {
      id: key,
      label: link.label,
      detail: `/go/${link.code}`,
      clicks: (existing?.clicks ?? 0) + link.clicks,
      leads: existing?.leads ?? 0,
      members: existing?.members ?? 0,
      earnings: existing?.earnings ?? 0,
    });
  }

  return [...sourceMap.values()]
    .sort((a, b) => {
      if (b.clicks !== a.clicks) return b.clicks - a.clicks;
      return b.earnings - a.earnings;
    })
    .slice(0, 5);
}

function getNextMilestone(members: number) {
  const milestones = [1, 5, 10, 25, 50];
  const next = milestones.find((value) => members < value) ?? milestones[milestones.length - 1];
  const previous = milestones.filter((value) => value < next).at(-1) ?? 0;
  const progressBase = Math.max(next - previous, 1);
  const progress = Math.min(100, Math.max(0, ((members - previous) / progressBase) * 100));

  return {
    label: next === 1 ? "First member milestone" : `Next member milestone`,
    value: `${members}/${next} members`,
    progress,
  };
}

function getMomentumCopy(input: {
  visitors: number;
  leads: number;
  members: number;
  recentCommissions: number;
  recentEarnings: number;
}) {
  if (input.recentCommissions > 0) {
    return {
      title: "You have recent momentum",
      body: `You generated ${input.recentCommissions} commission${input.recentCommissions === 1 ? "" : "s"} recently, worth $${(input.recentEarnings / 100).toFixed(2)} in earnings.`,
    };
  }

  if (input.visitors > 0 && input.members === 0) {
    return {
      title: "People are clicking",
      body: "You already have traffic. A more personal email or text could help turn that interest into your first member.",
    };
  }

  if (input.members > 0) {
    return {
      title: "Your referrals are active",
      body: "You already have members under your link. This is a good moment to create a source-tagged link and see what channel grows best next.",
    };
  }

  return {
    title: "Your link is ready to work",
    body: "Start with one personal share this week. Affiliates usually see the best early traction from warm outreach, not broad posting.",
  };
}

function getNextAction(input: {
  visitors: number;
  leads: number;
  members: number;
  topSources: AffiliatePortalSource[];
}) {
  if (input.visitors === 0) {
    return {
      title: "Start with one warm share",
      body: "Send your main link to one person who already trusts your recommendation. That is usually the fastest way to get your first click.",
    };
  }

  if (input.leads === 0) {
    return {
      title: "Create a source-tagged link",
      body: "Make a custom link for your blog, email, or bio so you can see which channel is actually bringing clicks.",
    };
  }

  if (input.members === 0) {
    return {
      title: "Follow up personally",
      body: "You have attention but not conversions yet. A personal text or short email will usually outperform another public post.",
    };
  }

  if (input.topSources.length > 0) {
    return {
      title: `Double down on ${input.topSources[0].label}`,
      body: "Your best-performing source is already showing traction. Share there again with a fresh caption or personal recommendation.",
    };
  }

  return {
    title: "Add one more sharing channel",
    body: "You already have members. The next lever is consistency: pick one more channel and share with a dedicated source tag.",
  };
}

export function buildAffiliatePortalViewModel(input: {
  stats: PromoterStats | null;
  commissions: AffiliateCommission[];
  payouts: AffiliatePayout[];
  trendReport: PromoterTrendPoint[];
  urlReports: PromoterUrlReport[];
  legacyLinks: LegacyAffiliateLinkSummary[];
  paypalEmail: string;
  hasW9: boolean;
}): AffiliatePortalViewModel {
  const visitors = input.stats?.visitors ?? 0;
  const leads = input.stats?.leads ?? 0;
  const members = input.stats?.conversions ?? 0;
  const totalPaid = input.payouts
    .filter((payout) => payout.state === "paid")
    .reduce((sum, payout) => sum + payout.amount, 0);
  const totalPending = input.commissions
    .filter((commission) => !["paid", "rejected", "denied", "voided", "canceled", "cancelled"].includes(commission.status.toLowerCase()))
    .reduce((sum, commission) => sum + commission.amount, 0);
  const totalEarned = totalPaid + totalPending;
  const conversionRate = visitors > 0 ? (members / visitors) * 100 : 0;
  const lastPayoutDate = input.payouts
    .slice()
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]?.created_at ?? null;

  const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentCommissions = input.commissions.filter(
    (commission) => Date.parse(commission.created_at) >= recentCutoff
  );
  const recentEarnings = recentCommissions.reduce((sum, commission) => sum + commission.amount, 0);

  const topSources = buildTopSources({
    urlReports: input.urlReports,
    legacyLinks: input.legacyLinks,
  });
  const milestone = getNextMilestone(members);
  const momentum = getMomentumCopy({
    visitors,
    leads,
    members,
    recentCommissions: recentCommissions.length,
    recentEarnings,
  });
  const nextAction = getNextAction({
    visitors,
    leads,
    members,
    topSources,
  });

  return {
    visitors,
    leads,
    members,
    conversionRate,
    totalPaid,
    totalPending,
    totalEarned,
    lastPayoutDate,
    payoutReady: Boolean(input.paypalEmail.trim()) && (totalEarned < 60000 || input.hasW9),
    momentumTitle: momentum.title,
    momentumBody: momentum.body,
    milestoneLabel: milestone.label,
    milestoneValue: milestone.value,
    milestoneProgress: milestone.progress,
    nextActionTitle: nextAction.title,
    nextActionBody: nextAction.body,
    earningsTrend: buildTrend(
      input.trendReport,
      input.commissions,
      (point) => Math.round(point.earnings / 100),
      (items) => Math.round(items.reduce((sum, item) => sum + item.amount, 0) / 100)
    ),
    membersTrend: buildTrend(
      input.trendReport,
      input.commissions,
      (point) => point.conversions,
      (items) => items.length
    ),
    topSources,
  };
}
