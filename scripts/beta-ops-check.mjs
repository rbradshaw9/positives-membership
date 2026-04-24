#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

function loadEnv(path) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Fall through to ambient process.env when .env.local is unavailable.
  }
}

loadEnv(envPath);

const DEFAULT_BETA_FEEDBACK_SECTION_GID = "1214140242515252";
const SENTRY_ORG = process.env.SENTRY_ORG || "positives";
const SENTRY_PROJECT = process.env.SENTRY_PROJECT || "positives";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://positives.life").replace(/\/$/, "");
const EXPECTED_STRIPE_WEBHOOK_URL = `${APP_URL}/api/webhooks/stripe`;

function line(value = "") {
  console.log(value);
}

function status(ok, label = "") {
  return ok ? `OK${label ? ` - ${label}` : ""}` : `CHECK${label ? ` - ${label}` : ""}`;
}

async function safe(name, callback) {
  try {
    return { ok: true, value: await callback() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : `${name} check failed`,
    };
  }
}

async function jsonFetch(url, init = {}) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function getFeedback() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const { data, error, count } = await supabase
    .from("beta_feedback_submission")
    .select("id, created_at, member_email, summary, severity, status", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw error;

  const open = (data ?? []).filter((item) => !["resolved", "closed"].includes(item.status));
  const blockerHigh = open.filter((item) => ["blocker", "high"].includes(item.severity));
  return { total: count ?? data?.length ?? 0, open, blockerHigh, latest: data ?? [] };
}

async function getSupabase() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const [buckets, earlyMembers] = await Promise.all([
    supabase.storage.listBuckets(),
    supabase
      .from("member")
      .select("id", { count: "exact", head: true })
      .in("launch_cohort", ["alpha", "beta"]),
  ]);
  if (buckets.error) throw buckets.error;
  if (earlyMembers.error) throw earlyMembers.error;
  const feedbackBucket = buckets.data.find((bucket) => bucket.name === "beta-feedback-uploads");
  return { feedbackBucket, earlyReleaseMembers: earlyMembers.count ?? 0 };
}

async function getSentry() {
  if (!process.env.SENTRY_AUTH_TOKEN) throw new Error("SENTRY_AUTH_TOKEN is not configured.");
  const headers = { Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}` };
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
    jsonFetch(
      `https://sentry.io/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/?query=is%3Aunresolved&statsPeriod=24h&limit=5`,
      { headers }
    ),
    jsonFetch(`https://sentry.io/api/0/organizations/${SENTRY_ORG}/monitors/`, { headers }),
    jsonFetch(`https://sentry.io/api/0/organizations/${SENTRY_ORG}/events/?${performanceParams.toString()}`, {
      headers,
    }),
  ]);
  return { issues, monitors, transactions: transactions.data ?? [] };
}

async function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured.");
  const headers = { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` };
  const [account, webhooks] = await Promise.all([
    jsonFetch("https://api.stripe.com/v1/account", { headers }),
    jsonFetch("https://api.stripe.com/v1/webhook_endpoints?limit=10", { headers }),
  ]);
  const matchingWebhook = webhooks.data.find((endpoint) => endpoint.url === EXPECTED_STRIPE_WEBHOOK_URL);
  return { account, webhooks: webhooks.data, matchingWebhook };
}

async function getAsana() {
  if (!process.env.ASANA_ACCESS_TOKEN) throw new Error("ASANA_ACCESS_TOKEN is not configured.");
  const sectionGid =
    process.env.ASANA_BETA_FEEDBACK_SECTION_GID || DEFAULT_BETA_FEEDBACK_SECTION_GID;
  const tasks = await jsonFetch(
    `https://app.asana.com/api/1.0/sections/${sectionGid}/tasks?opt_fields=gid,name,completed,permalink_url&limit=100`,
    {
      headers: {
        Authorization: `Bearer ${process.env.ASANA_ACCESS_TOKEN}`,
      },
    }
  );
  return { sectionGid, tasks: tasks.data.filter((task) => !task.completed) };
}

const [feedback, supabase, sentry, stripe, asana] = await Promise.all([
  safe("feedback", getFeedback),
  safe("supabase", getSupabase),
  safe("sentry", getSentry),
  safe("stripe", getStripe),
  safe("asana", getAsana),
]);

line("# Beta Ops Check");
line();
line(`Generated: ${new Date().toISOString()}`);
line(`App URL: ${APP_URL}`);
line();

line("## Beta Feedback");
if (feedback.ok) {
  line(`- ${status(feedback.value.blockerHigh.length === 0, `${feedback.value.blockerHigh.length} high/blocker open`)}`);
  line(`- Total reports: ${feedback.value.total}`);
  line(`- Open reports: ${feedback.value.open.length}`);
  for (const item of feedback.value.latest.slice(0, 5)) {
    line(`- ${item.status}/${item.severity}: ${item.summary} (${item.member_email})`);
  }
} else {
  line(`- CHECK - ${feedback.error}`);
}
line();

line("## Sentry");
if (sentry.ok) {
  line(`- ${status(sentry.value.issues.length === 0, `${sentry.value.issues.length} unresolved recent issues`)}`);
  line(`- Active monitors: ${sentry.value.monitors.filter((monitor) => monitor.status === "active").length}`);
  for (const issue of sentry.value.issues.slice(0, 5)) {
    line(`- ${issue.shortId ?? "Issue"}: ${issue.title}`);
  }
  line("- Slowest Sentry transactions by p75 over 14d:");
  for (const transaction of sentry.value.transactions.slice(0, 5)) {
    const duration = Number(transaction["p75(transaction.duration)"] ?? 0);
    const formattedDuration = duration >= 1000 ? `${(duration / 1000).toFixed(1)}s` : `${Math.round(duration)}ms`;
    line(`  - ${transaction.transaction}: ${formattedDuration} p75 (${transaction["count()"] ?? 0} events)`);
  }
} else {
  line(`- CHECK - ${sentry.error}`);
}
line();

line("## Stripe");
if (stripe.ok) {
  const accountReady =
    stripe.value.account.charges_enabled &&
    stripe.value.account.payouts_enabled &&
    stripe.value.account.details_submitted;
  line(`- ${status(accountReady, "account live readiness")}`);
  line(`- Charges enabled: ${stripe.value.account.charges_enabled}`);
  line(`- Payouts enabled: ${stripe.value.account.payouts_enabled}`);
  line(`- Details submitted: ${stripe.value.account.details_submitted}`);
  line(`- Expected webhook: ${EXPECTED_STRIPE_WEBHOOK_URL}`);
  line(`- Matching webhook: ${stripe.value.matchingWebhook?.status ?? "not found"}`);
} else {
  line(`- CHECK - ${stripe.error}`);
}
line();

line("## Supabase");
if (supabase.ok) {
  line(`- ${status(Boolean(supabase.value.feedbackBucket), "feedback upload bucket")}`);
  line(`- Bucket private: ${supabase.value.feedbackBucket?.public === false}`);
  line(`- Early-release members: ${supabase.value.earlyReleaseMembers}`);
} else {
  line(`- CHECK - ${supabase.error}`);
}
line();

line("## Vercel");
line("- CHECK LINKS - Review production deployment, logs, Speed Insights, and Analytics.");
line("- Project: https://vercel.com/positives/positives-membership");
line("- Logs: https://vercel.com/positives/positives-membership/logs");
line("- Speed Insights: https://vercel.com/positives/positives-membership/speed-insights");
line("- Analytics: https://vercel.com/positives/positives-membership/analytics");
line();

line("## Asana");
if (asana.ok) {
  line(`- Open Beta Feedback Triage tasks: ${asana.value.tasks.length}`);
  for (const task of asana.value.tasks.slice(0, 5)) {
    line(`- ${task.name}${task.permalink_url ? ` (${task.permalink_url})` : ""}`);
  }
} else {
  line(`- CHECK - ${asana.error}`);
}
