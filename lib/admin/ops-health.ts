import { config } from "@/lib/config";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { getOpenBetaFeedbackAsanaTasks } from "@/lib/integrations/asana";

type HealthTone = "good" | "watch" | "risk" | "neutral";

type SentryIssue = {
  id: string;
  shortId: string;
  title: string;
  permalink: string;
  count: string;
  lastSeen: string;
};

type SentryMonitor = {
  slug: string;
  name: string;
  status: string;
};

type SentryTransaction = {
  transaction: string;
  count: number;
  p75Ms: number;
};

type StripeWebhookEndpoint = {
  id: string;
  url: string;
  status: string;
  livemode: boolean;
  enabledEvents: string[];
};

async function safeJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function stripeModeLabel(secretKey?: string) {
  if (!secretKey) return "not configured";
  return secretKey.startsWith("sk_live_") ? "live mode" : "test mode";
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dashboardLinks() {
  return {
    vercelProject: "https://vercel.com/positives/positives-membership",
    vercelDeployments: "https://vercel.com/positives/positives-membership/deployments",
    vercelLogs: "https://vercel.com/positives/positives-membership/logs",
    vercelSpeedInsights: "https://vercel.com/positives/positives-membership/speed-insights",
    vercelAnalytics: "https://vercel.com/positives/positives-membership/analytics",
    sentryIssues: "https://positives.sentry.io/issues/",
    sentryMonitors: "https://positives.sentry.io/insights/backend/crons/",
    stripeWebhooks: "https://dashboard.stripe.com/webhooks",
    supabaseLogs: "https://supabase.com/dashboard/project/qdnojizzldilqpyocora/logs/explorer",
    supabaseStorage: "https://supabase.com/dashboard/project/qdnojizzldilqpyocora/storage/buckets",
    asanaBetaFeedback:
      "https://app.asana.com/1/1121814557377551/project/1214005103885510/list?section=1214140242515252",
  };
}

export async function getOpsHealthSnapshot() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const appUrl = config.app.url.replace(/\/$/, "");
  const expectedStripeWebhookUrl = `${appUrl}/api/webhooks/stripe`;

  const [
    feedbackResult,
    earlyMemberResult,
    bucketsResult,
    asanaResult,
    sentryResult,
    stripeResult,
  ] = await Promise.all([
    getFeedbackSnapshot(supabase),
    getEarlyMemberCount(supabase),
    getFeedbackBucketSnapshot(),
    getOpenBetaFeedbackAsanaTasks(),
    getSentrySnapshot(),
    getStripeSnapshot(expectedStripeWebhookUrl),
  ]);

  const latestCommit = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.SENTRY_RELEASE ?? null;
  const latestDeployment =
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_APP_URL ?? null;

  return {
    generatedAt: new Date().toISOString(),
    appUrl,
    links: dashboardLinks(),
    feedback: feedbackResult,
    sentry: sentryResult,
    stripe: stripeResult,
    supabase: {
      connected: !feedbackResult.error && !earlyMemberResult.error,
      feedbackBucket: bucketsResult,
      earlyReleaseMembers: earlyMemberResult.count,
      error: feedbackResult.error ?? earlyMemberResult.error ?? bucketsResult.error,
    },
    vercel: {
      latestCommit,
      latestDeployment,
      speedInsightsWired: true,
      analyticsWired: true,
      tone: "neutral" as HealthTone,
    },
    asana: {
      configured: asanaResult.configured,
      openTasks: asanaResult.tasks.length,
      sectionGid: asanaResult.sectionGid,
      tasks: asanaResult.tasks.slice(0, 5),
      error: asanaResult.error,
      tone: asanaResult.error ? "watch" as HealthTone : "good" as HealthTone,
    },
  };
}

async function getFeedbackSnapshot(supabase: ReturnType<typeof asLooseSupabaseClient>) {
  const { data, error, count } = await supabase
    .from("beta_feedback_submission")
    .select<
      {
        id: string;
        created_at: string;
        member_email: string;
        summary: string;
        severity: string;
        status: string;
      }[]
    >("id, created_at, member_email, summary, severity, status", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return {
      total: 0,
      open: 0,
      blockerHigh: 0,
      unassigned: 0,
      latest: [],
      error: error.message,
      tone: "risk" as HealthTone,
    };
  }

  const rows = data ?? [];
  const open = rows.filter((item) => !["resolved", "closed"].includes(item.status)).length;
  const blockerHigh = rows.filter(
    (item) => !["resolved", "closed"].includes(item.status) && ["blocker", "high"].includes(item.severity)
  ).length;

  const { count: unassignedCount } = await supabase
    .from("beta_feedback_submission")
    .select("id", { count: "exact", head: true })
    .is("assigned_member_id", null)
    .not("status", "in", "(resolved,closed)");

  return {
    total: count ?? rows.length,
    open,
    blockerHigh,
    unassigned: unassignedCount ?? 0,
    latest: rows.slice(0, 5),
    error: null as string | null,
    tone: blockerHigh > 0 ? "risk" as HealthTone : open > 0 ? "watch" as HealthTone : "good" as HealthTone,
  };
}

async function getEarlyMemberCount(supabase: ReturnType<typeof asLooseSupabaseClient>) {
  const { count, error } = await supabase
    .from("member")
    .select("id", { count: "exact", head: true })
    .in("launch_cohort", ["alpha", "beta"]);

  return {
    count: count ?? 0,
    error: error?.message ?? null,
  };
}

async function getFeedbackBucketSnapshot() {
  try {
    const { data, error } = await getAdminClient().storage.listBuckets();
    if (error) throw error;
    const bucket = data.find((item) => item.name === "beta-feedback-uploads");
    if (!bucket) {
      return {
        exists: false,
        public: null,
        fileSizeLimit: null,
        allowedMimeTypes: [] as string[],
        error: "beta-feedback-uploads bucket is missing.",
        tone: "risk" as HealthTone,
      };
    }

    return {
      exists: true,
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit ?? null,
      allowedMimeTypes: bucket.allowed_mime_types ?? [],
      error: null as string | null,
      tone: bucket.public ? "risk" as HealthTone : "good" as HealthTone,
    };
  } catch (error) {
    return {
      exists: false,
      public: null,
      fileSizeLimit: null,
      allowedMimeTypes: [] as string[],
      error: error instanceof Error ? error.message : "Bucket lookup failed.",
      tone: "risk" as HealthTone,
    };
  }
}

async function getSentrySnapshot() {
  const token = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG || "positives";
  const project = process.env.SENTRY_PROJECT || "positives";

  if (!token) {
    return {
      configured: false,
      unresolvedCount: null,
      issues: [] as SentryIssue[],
      monitors: [] as SentryMonitor[],
      slowTransactions: [] as SentryTransaction[],
      error: "SENTRY_AUTH_TOKEN is not configured.",
      tone: "watch" as HealthTone,
    };
  }

  try {
    const performanceParams = new URLSearchParams({
      query: "event.type:transaction",
      sort: "-p75_transaction_duration",
      statsPeriod: "14d",
      per_page: "5",
    });
    performanceParams.append("field", "transaction");
    performanceParams.append("field", "count()");
    performanceParams.append("field", "p75(transaction.duration)");

    const [issues, monitors, transactions] = await Promise.all([
      safeJson<Array<Record<string, unknown>>>(
        `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=is%3Aunresolved&statsPeriod=24h&limit=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      safeJson<Array<Record<string, unknown>>>(
        `https://sentry.io/api/0/organizations/${org}/monitors/`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      safeJson<{ data: Array<Record<string, unknown>> }>(
        `https://sentry.io/api/0/organizations/${org}/events/?${performanceParams.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
    ]);

    const mappedIssues = (issues ?? []).map((issue) => ({
      id: String(issue.id ?? ""),
      shortId: String(issue.shortId ?? issue.short_id ?? ""),
      title: String(issue.title ?? "Untitled Sentry issue"),
      permalink: String(issue.permalink ?? dashboardLinks().sentryIssues),
      count: String(issue.count ?? "0"),
      lastSeen: String(issue.lastSeen ?? issue.last_seen ?? ""),
    }));
    const mappedMonitors = (monitors ?? []).map((monitor) => ({
      slug: String(monitor.slug ?? ""),
      name: String(monitor.name ?? monitor.slug ?? "Monitor"),
      status: String(monitor.status ?? "unknown"),
    }));
    const mappedTransactions = (transactions?.data ?? []).map((transaction) => ({
      transaction: String(transaction.transaction ?? "Unknown transaction"),
      count: toNumber(transaction["count()"]),
      p75Ms: toNumber(transaction["p75(transaction.duration)"]),
    }));

    return {
      configured: true,
      unresolvedCount: mappedIssues.length,
      issues: mappedIssues,
      monitors: mappedMonitors,
      slowTransactions: mappedTransactions,
      error: null as string | null,
      tone: mappedIssues.length > 0 ? "watch" as HealthTone : "good" as HealthTone,
    };
  } catch (error) {
    return {
      configured: true,
      unresolvedCount: null,
      issues: [] as SentryIssue[],
      monitors: [] as SentryMonitor[],
      slowTransactions: [] as SentryTransaction[],
      error: error instanceof Error ? error.message : "Sentry lookup failed.",
      tone: "watch" as HealthTone,
    };
  }
}

async function getStripeSnapshot(expectedWebhookUrl: string) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      configured: false,
      mode: "not configured",
      account: null,
      expectedWebhookUrl,
      webhookEndpoints: [] as StripeWebhookEndpoint[],
      matchingWebhook: null as StripeWebhookEndpoint | null,
      error: "STRIPE_SECRET_KEY is not configured.",
      tone: "watch" as HealthTone,
    };
  }

  try {
    const [account, webhooks] = await Promise.all([
      safeJson<Record<string, unknown>>("https://api.stripe.com/v1/account", {
        headers: { Authorization: `Bearer ${secretKey}` },
      }),
      safeJson<{ data: Array<Record<string, unknown>> }>(
        "https://api.stripe.com/v1/webhook_endpoints?limit=10",
        { headers: { Authorization: `Bearer ${secretKey}` } }
      ),
    ]);

    const endpoints = (webhooks?.data ?? []).map((endpoint) => ({
      id: String(endpoint.id ?? ""),
      url: String(endpoint.url ?? ""),
      status: String(endpoint.status ?? ""),
      livemode: Boolean(endpoint.livemode),
      enabledEvents: Array.isArray(endpoint.enabled_events)
        ? endpoint.enabled_events.map(String)
        : [],
    }));
    const matchingWebhook = endpoints.find((endpoint) => endpoint.url === expectedWebhookUrl) ?? null;
    const accountReady = Boolean(
      account?.charges_enabled && account?.payouts_enabled && account?.details_submitted
    );

    return {
      configured: true,
      mode: stripeModeLabel(secretKey),
      account: {
        id: String(account?.id ?? ""),
        chargesEnabled: Boolean(account?.charges_enabled),
        payoutsEnabled: Boolean(account?.payouts_enabled),
        detailsSubmitted: Boolean(account?.details_submitted),
        ready: accountReady,
      },
      expectedWebhookUrl,
      webhookEndpoints: endpoints,
      matchingWebhook,
      error: null as string | null,
      tone: accountReady && matchingWebhook?.status === "enabled" ? "good" as HealthTone : "watch" as HealthTone,
    };
  } catch (error) {
    return {
      configured: true,
      mode: stripeModeLabel(secretKey),
      account: null,
      expectedWebhookUrl,
      webhookEndpoints: [] as StripeWebhookEndpoint[],
      matchingWebhook: null as StripeWebhookEndpoint | null,
      error: error instanceof Error ? error.message : "Stripe lookup failed.",
      tone: "watch" as HealthTone,
    };
  }
}
