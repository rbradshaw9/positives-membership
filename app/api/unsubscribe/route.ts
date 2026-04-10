/**
 * app/api/unsubscribe/route.ts
 *
 * One-click unsubscribe endpoint — required by Gmail/Yahoo bulk sender rules.
 *
 * GET  /api/unsubscribe?email=...&token=...  — shows confirmation page
 * POST /api/unsubscribe                      — List-Unsubscribe-Post handler
 *
 * Adds the member to the `email_unsubscribed` set in Resend (suppression list)
 * so no further marketing emails are sent. Transactional emails (receipts,
 * password resets) are NOT suppressed — those use separate Resend logic.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend } from "@/lib/email/resend";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function suppressEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Add to Resend contact suppression
  try {
    await (resend.contacts as unknown as {
      create: (opts: { email: string; audienceId: string; unsubscribed: boolean }) => Promise<unknown>;
    }).create({
      email: normalizedEmail,
      audienceId: process.env.RESEND_AUDIENCE_ID ?? "",
      unsubscribed: true,
    });
  } catch {
    // Non-fatal if Resend audience not configured — still suppress in our DB
  }

  // 2. Record in our DB so cron jobs skip this address
  await supabase
    .from("member")
    .update({ email_unsubscribed: true })
    .eq("email", normalizedEmail);
}

function verifyRequest(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  const token = (req.nextUrl.searchParams.get("token") ?? "").trim();

  if (!email || !token) {
    return { ok: false as const, reason: "missing" as const, email };
  }

  const verification = verifyUnsubscribeToken(email, token);
  if (!verification.ok) {
    return { ok: false as const, reason: verification.reason, email };
  }

  return { ok: true as const, email: verification.email };
}

function renderResponseHtml({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background: #FAFAFA; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 16px; padding: 48px 40px; max-width: 420px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
    h1 { margin: 0 0 12px; font-size: 22px; color: #09090B; }
    p { margin: 0 0 24px; font-size: 15px; color: #52525B; line-height: 1.6; }
    a { display: inline-block; padding: 13px 32px; background: linear-gradient(135deg, #2EC4B6, #44A8D8); color: #fff; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    ${body}
    <a href="https://positives.life">Back to Positives</a>
  </div>
</body>
</html>`;
}

/** GET — user-facing confirmation page */
export async function GET(req: NextRequest) {
  const verification = verifyRequest(req);

  if (verification.ok) {
    await suppressEmail(verification.email);

    const html = renderResponseHtml({
      title: "Unsubscribed — Positives",
      body: `
    <h1>You&rsquo;ve been unsubscribed.</h1>
    <p>We&rsquo;ve removed <strong>${verification.email.replace(/</g, "&lt;")}</strong> from our marketing emails. You&rsquo;ll still receive important account notifications.</p>`,
    });

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  const html = renderResponseHtml({
    title: "Unsubscribe link expired — Positives",
    body: `
    <h1>This unsubscribe link isn&rsquo;t valid anymore.</h1>
    <p>For safety, unsubscribe links are signed and expire after a while. Please use the latest email we sent you, or reply to support@positives.life and we&rsquo;ll take care of it.</p>`,
  });

  return new NextResponse(html, {
    status: 400,
    headers: { "Content-Type": "text/html" },
  });
}

/** POST — List-Unsubscribe-Post handler (email client sends this automatically) */
export async function POST(req: NextRequest) {
  const verification = verifyRequest(req);
  if (!verification.ok) {
    return new NextResponse(null, { status: 400 });
  }

  await suppressEmail(verification.email);
  return new NextResponse(null, { status: 200 });
}
