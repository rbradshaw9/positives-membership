import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { config } from "@/lib/config";
import { sendPostmarkEmail } from "@/lib/email/postmark";
import { renderMembershipCancellationEmail } from "@/lib/email/templates/membership-cancellation-email";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscriptionAtPeriodEnd } from "@/server/services/stripe/member-plan-actions";

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member, error: memberError } = await supabase
    .from("member")
    .select("stripe_customer_id, email, name")
    .eq("id", user.id)
    .single();

  if (memberError || !member?.stripe_customer_id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const result = await cancelSubscriptionAtPeriodEnd(member.stripe_customer_id);

  if (result.ok) {
    let emailSent = false;
    if (member.email) {
      try {
        const rendered = renderMembershipCancellationEmail({
          recipientEmail: member.email,
          memberName: member.name,
          periodEndLabel: result.periodEndLabel,
          winbackCode: result.winbackCode,
          joinUrl: `${config.app.url}/join`,
        });
        await sendPostmarkEmail({
          to: member.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tag: "membership-cancellation",
          idempotencyKey: `membership-cancellation-${user.id}-${result.periodEndLabel}`,
        });
        emailSent = true;
      } catch (error) {
        console.error("[Billing] Failed to send cancellation email:", error);
      }
    }

    revalidateTag(`account-billing-summary-${member.stripe_customer_id}`, "max");
    return NextResponse.json({
      ok: true,
      periodEndLabel: result.periodEndLabel,
      winbackCode: result.winbackCode,
      emailSent,
    });
  }

  const status = result.reason === "no_subscription" ? 422 : 500;
  return NextResponse.json({ error: result.message }, { status });
}
