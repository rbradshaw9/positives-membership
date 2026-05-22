import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { applyMemberDowngradeToLevel1 } from "@/server/services/stripe/member-plan-actions";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member, error: memberError } = await supabase
    .from("member")
    .select("stripe_customer_id, subscription_tier")
    .eq("id", user.id)
    .single();

  if (memberError || !member?.stripe_customer_id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.subscription_tier === "level_1") {
    return NextResponse.json(
      { error: "Downgrade is only available for Plus members." },
      { status: 422 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const result = await applyMemberDowngradeToLevel1(member.stripe_customer_id, {
    includeFreeMonth: body?.offer === "free_month",
  });

  if (result.ok) {
    revalidateTag(`account-billing-summary-${member.stripe_customer_id}`, "max");
    return NextResponse.json({
      ok: true,
      effectiveLabel: result.effectiveLabel,
      offerApplied: result.offerApplied,
    });
  }

  const status = result.reason === "no_subscription" || result.reason === "same_plan" ? 422 : 500;
  return NextResponse.json({ error: result.message }, { status });
}
