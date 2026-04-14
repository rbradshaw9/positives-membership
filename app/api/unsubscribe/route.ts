/**
 * app/api/unsubscribe/route.ts
 *
 * One-click unsubscribe endpoint — required by Gmail/Yahoo bulk sender rules.
 *
 * GET  /api/unsubscribe?email=...&token=...  — shows confirmation page
 * POST /api/unsubscribe                      — List-Unsubscribe-Post handler
 *
 * Marks the member as unsubscribed in our DB and syncs ActiveCampaign list status.
 * Transactional emails are handled separately and are not suppressed here.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncMarketingPreference } from "@/lib/activecampaign/sync";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function suppressEmail(email: string): Promise<{ memberUpdateError: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Record in our DB so lifecycle automations skip this address
  const { error } = await supabase
    .from("member")
    .update({ email_unsubscribed: true })
    .eq("email", normalizedEmail);

  if (error) {
    console.error("[unsubscribe] failed to persist email_unsubscribed:", error.message);
  }

  // 2. Sync ActiveCampaign marketing preference
  await syncMarketingPreference({ email: normalizedEmail, subscribe: false });

  return { memberUpdateError: Boolean(error) };
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
    const result = await suppressEmail(verification.email);

    if (result.memberUpdateError) {
      const html = renderResponseHtml({
        title: "We received your unsubscribe request — Positives",
        body: `
    <h1>We got your request.</h1>
    <p>We could not fully confirm the unsubscribe in our app records just yet. Please reply to support@positives.life and we’ll make sure <strong>${verification.email.replace(/</g, "&lt;")}</strong> is removed from optional marketing emails.</p>`,
      });

      return new NextResponse(html, {
        status: 500,
        headers: { "Content-Type": "text/html" },
      });
    }

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

  const result = await suppressEmail(verification.email);

  if (result.memberUpdateError) {
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(null, { status: 200 });
}
