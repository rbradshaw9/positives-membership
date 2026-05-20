import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyRetentionCoupon } from "@/server/services/stripe/member-plan-actions";

export async function POST() {
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

  const result = await applyRetentionCoupon(
    member.stripe_customer_id,
    member.subscription_tier
  );

  if (result.ok) return NextResponse.json({ ok: true });

  const status = result.reason === "no_subscription" ? 422 : 500;
  return NextResponse.json({ error: result.message }, { status });
}
