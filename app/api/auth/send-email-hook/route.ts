import { Webhook } from "standardwebhooks";
import { resend, FROM_ADDRESS, REPLY_TO } from "@/lib/email/resend";
import {
  authEmailHtml,
  authEmailText,
  type AuthEmailKind,
} from "@/lib/email/templates/auth";

type HookAction = "signup" | "magiclink" | "recovery" | "invite" | "email_change";
type VerifyType = "email" | "recovery" | "invite" | "email_change";

type HookPayload = {
  user: {
    id?: string;
    email: string;
    new_email?: string;
    user_metadata?: {
      first_name?: string;
      full_name?: string;
      name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: HookAction;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
    old_email?: string;
  };
};

type EmailJob = {
  to: string;
  subject: string;
  kind: AuthEmailKind;
  confirmUrl: string;
  token?: string;
  idempotencyKey: string;
};

function getHookSecret(): string {
  const raw = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!raw) {
    throw new Error("SEND_EMAIL_HOOK_SECRET is not set.");
  }

  return raw.replace(/^v1,whsec_/, "");
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life";
}

function firstNameFromUser(user: HookPayload["user"]): string {
  const fullName =
    user.user_metadata?.first_name ??
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    user.email.split("@")[0] ??
    "there";

  return fullName.trim().split(/\s+/)[0] || "there";
}

function sanitizeRedirectPath(rawTarget: string | null | undefined, fallback: string): string {
  if (!rawTarget) return fallback;

  if (rawTarget.startsWith("/")) {
    if (rawTarget.startsWith("/auth/callback")) {
      try {
        const legacy = new URL(rawTarget, getAppUrl());
        const nextParam = legacy.searchParams.get("next");
        if (nextParam?.startsWith("/")) return nextParam;
      } catch {
        return fallback;
      }
    }
    return rawTarget;
  }

  try {
    const appUrl = new URL(getAppUrl());
    const targetUrl = new URL(rawTarget);
    if (targetUrl.origin !== appUrl.origin) return fallback;
    if (targetUrl.pathname === "/auth/callback") {
      const nextParam = targetUrl.searchParams.get("next");
      if (nextParam?.startsWith("/")) return nextParam;
    }
    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return fallback;
  }
}

function buildConfirmUrl(tokenHash: string, type: VerifyType, redirectTo: string): string {
  const appUrl = new URL(getAppUrl());
  appUrl.pathname = "/auth/confirm";
  appUrl.searchParams.set("token_hash", tokenHash);
  appUrl.searchParams.set("type", type);
  appUrl.searchParams.set("redirect_to", redirectTo);
  return appUrl.toString();
}

function sendModeForAction(action: HookAction): {
  subject: string;
  kind: AuthEmailKind;
  verifyType: VerifyType;
  fallbackPath: string;
} {
  switch (action) {
    case "recovery":
      return {
        subject: "Reset your Positives password",
        kind: "recovery",
        verifyType: "recovery",
        fallbackPath: "/reset-password",
      };
    case "invite":
      return {
        subject: "You’re invited to Positives",
        kind: "invite",
        verifyType: "invite",
        fallbackPath: "/today",
      };
    case "magiclink":
    case "signup":
    default:
      return {
        subject: "Your Positives sign-in link",
        kind: "magic_link",
        verifyType: "email",
        fallbackPath: "/today",
      };
  }
}

function buildEmailJobs(payload: HookPayload): EmailJob[] {
  const { user, email_data } = payload;
  const action = email_data.email_action_type;

  if (action === "email_change") {
    const jobs: EmailJob[] = [];
    const currentEmail = user.email;
    const newEmail = user.new_email;

    if (currentEmail && email_data.token_hash_new) {
      const redirectPath = sanitizeRedirectPath(email_data.redirect_to, "/account");
      jobs.push({
        to: currentEmail,
        subject: "Confirm your current email for Positives",
        kind: "email_change_current",
        confirmUrl: buildConfirmUrl(email_data.token_hash_new, "email_change", redirectPath),
        token: email_data.token,
        idempotencyKey: `supabase-auth/email_change/current/${currentEmail}/${email_data.token_hash_new}`,
      });
    }

    const newEmailHash = email_data.token_hash || email_data.token_hash_new;
    const newEmailToken = email_data.token_new || email_data.token;
    if ((newEmail ?? currentEmail) && newEmailHash) {
      const redirectPath = sanitizeRedirectPath(email_data.redirect_to, "/account");
      jobs.push({
        to: newEmail ?? currentEmail,
        subject: "Confirm your new Positives email",
        kind: "email_change_new",
        confirmUrl: buildConfirmUrl(newEmailHash, "email_change", redirectPath),
        token: newEmailToken,
        idempotencyKey: `supabase-auth/email_change/new/${newEmail ?? currentEmail}/${newEmailHash}`,
      });
    }

    return jobs;
  }

  const mode = sendModeForAction(action);
  const redirectPath = sanitizeRedirectPath(email_data.redirect_to, mode.fallbackPath);

  return [
    {
      to: user.email,
      subject: mode.subject,
      kind: mode.kind,
      confirmUrl: buildConfirmUrl(email_data.token_hash, mode.verifyType, redirectPath),
      token: email_data.token,
      idempotencyKey: `supabase-auth/${action}/${user.id ?? user.email}/${email_data.token_hash}`,
    },
  ];
}

export async function POST(request: Request) {
  const payload = await request.text();
  const headers = Object.fromEntries(request.headers);

  try {
    const hook = new Webhook(getHookSecret());
    const { user, email_data } = hook.verify(payload, headers) as HookPayload;
    const jobs = buildEmailJobs({ user, email_data });
    const firstName = firstNameFromUser(user);

    for (const job of jobs) {
      const { data, error } = await resend.emails.send(
        {
          from: FROM_ADDRESS,
          to: [job.to],
          replyTo: REPLY_TO,
          subject: job.subject,
          html: authEmailHtml({
            kind: job.kind,
            firstName,
            confirmUrl: job.confirmUrl,
            code: job.token,
          }),
          text: authEmailText({
            kind: job.kind,
            firstName,
            confirmUrl: job.confirmUrl,
            code: job.token,
          }),
        },
        { idempotencyKey: job.idempotencyKey }
      );

      if (error) {
        console.error("[auth/send-email-hook] Resend send failed:", error.message);
        return Response.json(
          {
            error: {
              http_code: 500,
              message: error.message,
            },
          },
          { status: 500 }
        );
      }

      console.log("[auth/send-email-hook] Auth email sent:", data?.id ?? "unknown");
    }

    return Response.json({});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown send-email-hook error";
    console.error("[auth/send-email-hook] Verification failed:", message);
    return Response.json(
      {
        error: {
          http_code: 401,
          message,
        },
      },
      { status: 401 }
    );
  }
}
