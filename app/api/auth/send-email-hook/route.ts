import { renderAuthEmail } from "@/lib/email/templates/auth-email";
import { Webhook } from "standardwebhooks";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

type SendEmailHookPayload = {
  user?: {
    email?: string | null;
    new_email?: string | null;
  };
  email_data?: {
    token?: string | null;
    token_hash?: string | null;
    redirect_to?: string | null;
    email_action_type?: string | null;
    site_url?: string | null;
    token_new?: string | null;
    token_hash_new?: string | null;
  };
};

type EmailToSend = {
  to: string;
  actionType: string;
  tokenHash: string;
  code?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getHookSecret() {
  return process.env.SEND_EMAIL_HOOK_SECRET?.replace("v1,whsec_", "") ?? "";
}

function mapVerifyType(actionType: string) {
  if (actionType === "recovery") return "recovery";
  if (actionType === "invite") return "invite";
  if (actionType === "email_change") return "email_change";
  return "email";
}

function safeRedirectTarget(raw: string | null | undefined) {
  if (!raw) return "/today";

  try {
    const url = new URL(raw);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return raw.startsWith("/") ? raw : "/today";
  }
}

function buildActionUrl(params: {
  siteUrl: string;
  tokenHash: string;
  actionType: string;
  redirectTo: string | null | undefined;
}) {
  const url = new URL("/auth/confirm", params.siteUrl);
  url.searchParams.set("token_hash", params.tokenHash);
  url.searchParams.set("type", mapVerifyType(params.actionType));
  url.searchParams.set("next", safeRedirectTarget(params.redirectTo));
  return url.toString();
}

async function sendPostmarkEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  tag: string;
}) {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) throw new Error("POSTMARK_SERVER_TOKEN is not configured.");

  const from = process.env.POSTMARK_FROM_EMAIL ?? "Positives <test@positives.life>";
  const replyTo = process.env.POSTMARK_REPLY_TO_EMAIL ?? "support@positives.life";
  const messageStream = process.env.POSTMARK_MESSAGE_STREAM ?? "outbound";

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      From: from,
      To: input.to,
      ReplyTo: replyTo,
      Subject: input.subject,
      HtmlBody: input.html,
      TextBody: input.text,
      MessageStream: messageStream,
      Tag: input.tag,
      TrackOpens: false,
      TrackLinks: "None",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Postmark send failed: ${response.status} ${detail.slice(0, 500)}`);
  }
}

function buildEmailList(payload: SendEmailHookPayload): EmailToSend[] {
  const user = payload.user ?? {};
  const data = payload.email_data ?? {};
  const actionType = data.email_action_type ?? "magiclink";
  const primaryEmail = user.email ?? "";
  const newEmail = user.new_email ?? "";

  if (actionType === "email_change" && newEmail) {
    const emails: EmailToSend[] = [];

    if (primaryEmail && data.token_hash_new) {
      emails.push({
        to: primaryEmail,
        actionType,
        tokenHash: data.token_hash_new,
        code: data.token ?? null,
      });
    }

    if (data.token_hash) {
      emails.push({
        to: newEmail,
        actionType,
        tokenHash: data.token_hash,
        code: data.token_new ?? null,
      });
    }

    return emails;
  }

  if (!primaryEmail || !data.token_hash) return [];

  return [
    {
      to: primaryEmail,
      actionType,
      tokenHash: data.token_hash,
      code: data.token ?? null,
    },
  ];
}

export async function POST(request: NextRequest) {
  const hookSecret = getHookSecret();
  if (!hookSecret) return jsonError("Send email hook is not configured.", 500);

  const payloadText = await request.text();
  let payload: SendEmailHookPayload;

  try {
    const webhook = new Webhook(hookSecret);
    payload = webhook.verify(payloadText, Object.fromEntries(request.headers)) as SendEmailHookPayload;
  } catch (error) {
    console.error("[auth/send-email-hook] Signature verification failed:", error);
    return jsonError("Invalid hook signature.", 401);
  }

  const siteUrl =
    payload.email_data?.site_url ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://positives.life";
  const emails = buildEmailList(payload);

  if (emails.length === 0) {
    console.error("[auth/send-email-hook] Missing email or token hash in hook payload.");
    return jsonError("Missing email or token hash.", 400);
  }

  try {
    await Promise.all(
      emails.map((email) => {
        const actionUrl = buildActionUrl({
          siteUrl,
          tokenHash: email.tokenHash,
          actionType: email.actionType,
          redirectTo: payload.email_data?.redirect_to,
        });
        const rendered = renderAuthEmail({
          actionType: email.actionType,
          actionUrl,
          email: email.to,
          code: email.code,
        });

        return sendPostmarkEmail({
          to: email.to,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tag: `auth_${email.actionType}`,
        });
      }),
    );
  } catch (error) {
    console.error("[auth/send-email-hook] Email send failed:", error);
    return jsonError("Unable to send auth email.", 502);
  }

  return NextResponse.json({});
}
