import { NextRequest, NextResponse } from "next/server";

/**
 * app/api/webhooks/sentry/route.ts
 *
 * Receives Sentry webhooks (issue created, assigned, resolved) and:
 *   1. Verifies the sentry-hook-signature HMAC-SHA256 header
 *   2. Routes to the appropriate handler based on action type
 *   3. For new errors — logs structured context and (optionally) notifies Slack
 *
 * Sentry webhook docs: https://docs.sentry.io/organization/integrations/integration-platform/webhooks/
 *
 * Setup:
 *   1. In Sentry: Settings → Developer Settings → Internal Integration → Add Webhook
 *   2. Webhook URL: https://positives.life/api/webhooks/sentry
 *   3. Resources: Issue (created, assigned, resolved)
 *   4. Copy the "Client Secret" → set as SENTRY_WEBHOOK_SECRET in Vercel env
 */

const SENTRY_WEBHOOK_SECRET = process.env.SENTRY_WEBHOOK_SECRET;

/**
 * Verify Sentry webhook signature.
 * Sentry signs requests with HMAC-SHA256 over the raw body, using the
 * client secret as the key. The signature is in the `sentry-hook-signature` header.
 */
async function verifySignature(request: NextRequest, rawBody: string): Promise<boolean> {
  if (!SENTRY_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Sentry webhook] SENTRY_WEBHOOK_SECRET is not set in production.");
      return false;
    }
    console.warn("[Sentry webhook] SENTRY_WEBHOOK_SECRET not set — accepting in dev.");
    return true;
  }

  const signature = request.headers.get("sentry-hook-signature");
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SENTRY_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = Buffer.from(mac).toString("hex");

  // Constant-time comparison
  if (signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

type SentryIssue = {
  id: string;
  title: string;
  culprit: string;
  shortId: string;
  level: string;
  status: string;
  firstSeen: string;
  lastSeen: string;
  count: string;
  userCount: number;
  permalink: string;
  project: { id: string; name: string; slug: string };
};

type SentryWebhookPayload = {
  action: "created" | "resolved" | "assigned" | string;
  actor: { id: number; name: string; type: string } | null;
  data: {
    issue: SentryIssue;
  };
  installation: { uuid: string } | null;
};

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleIssueCreated(issue: SentryIssue): Promise<void> {
  const { title, culprit, shortId, level, permalink, project, firstSeen, userCount } = issue;

  // Structured log — visible in Vercel logs and Sentry itself
  console.error(
    JSON.stringify({
      event: "sentry.issue.created",
      shortId,
      title,
      culprit,
      level,
      project: project.slug,
      firstSeen,
      userCount,
      permalink,
    })
  );

  // Notify Slack if configured
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL_ALERTS;
  if (slackWebhookUrl) {
    try {
      const levelEmoji = level === "fatal" ? "🔴" : level === "error" ? "🟠" : "🟡";
      await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${levelEmoji} *New Sentry ${level.toUpperCase()}* — ${project.slug}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${levelEmoji} *New ${level.toUpperCase()} — ${project.slug}*\n*${shortId}* · ${title}`,
              },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*Culprit:*\n\`${culprit}\`` },
                { type: "mrkdwn", text: `*Users affected:*\n${userCount}` },
              ],
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "View in Sentry →" },
                  url: permalink,
                  style: "danger",
                },
              ],
            },
          ],
        }),
      });
    } catch (slackError) {
      console.error("[Sentry webhook] Slack notification failed:", slackError);
    }
  }
}

async function handleIssueResolved(issue: SentryIssue, actorName: string | null): Promise<void> {
  console.log(
    JSON.stringify({
      event: "sentry.issue.resolved",
      shortId: issue.shortId,
      title: issue.title,
      project: issue.project.slug,
      resolvedBy: actorName,
      permalink: issue.permalink,
    })
  );

  // Optional: notify Slack on resolution too
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL_ALERTS;
  if (slackWebhookUrl && actorName) {
    try {
      await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `✅ Resolved: *${issue.shortId}* — ${issue.title} (by ${actorName})`,
        }),
      });
    } catch {
      // Non-fatal
    }
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();

  const valid = await verifySignature(request, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SentryWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, data, actor } = payload;
  const issue = data?.issue;

  if (!issue) {
    return NextResponse.json({ received: true, ignored: "no_issue_data" }, { status: 202 });
  }

  try {
    switch (action) {
      case "created":
        await handleIssueCreated(issue);
        break;
      case "resolved":
        await handleIssueResolved(issue, actor?.name ?? null);
        break;
      case "assigned":
        console.log(
          JSON.stringify({
            event: "sentry.issue.assigned",
            shortId: issue.shortId,
            assignedTo: actor?.name,
            project: issue.project.slug,
          })
        );
        break;
      default:
        console.log(`[Sentry webhook] Unhandled action: ${action}`);
    }
  } catch (handlerError) {
    console.error("[Sentry webhook] Handler threw:", handlerError);
    // Return 200 so Sentry doesn't retry — we don't want a flood of retries on handler bugs
    return NextResponse.json({ received: true, error: "handler_failed" }, { status: 200 });
  }

  return NextResponse.json({ received: true, action });
}
