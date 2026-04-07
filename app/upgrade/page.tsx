import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { config } from "@/lib/config";
import { startUpgrade } from "./actions";
import { UpgradeForm } from "./UpgradeForm";

export const metadata = {
  title: "Upgrade Your Membership — Positives",
  description:
    "Add community events, Q&A access, and more to your Positives practice.",
};

/**
 * app/upgrade/page.tsx
 * Server component — tier upgrade page for existing active L1 members.
 *
 * Resolves price IDs server-side (never exposed to client bundle).
 * Passes them to UpgradeForm which renders the interactive UI.
 */
export default async function UpgradePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/upgrade");

  const { data: member } = await supabase
    .from("member")
    .select("subscription_status, subscription_tier, name")
    .eq("id", user.id)
    .single();

  // Non-active members → billing portal or join
  if (!member || member.subscription_status !== "active") {
    redirect("/join");
  }

  // Already on L2 or above — nothing to upgrade to (for now)
  if (
    member.subscription_tier === "level_2" ||
    member.subscription_tier === "level_3" ||
    member.subscription_tier === "level_4"
  ) {
    redirect("/account?already_upgraded=1");
  }

  const l2Monthly = config.stripe.prices.level2Monthly;
  const l2Annual = config.stripe.prices.level2Annual;
  const l3Monthly = config.stripe.prices.level3Monthly;
  const l3Annual = config.stripe.prices.level3Annual;

  return (
    <UpgradeForm
      memberName={member.name ?? ""}
      currentTier={member.subscription_tier ?? "level_1"}
      l2MonthlyPriceId={l2Monthly}
      l2AnnualPriceId={l2Annual}
      l3MonthlyPriceId={l3Monthly}
      l3AnnualPriceId={l3Annual}
      action={startUpgrade}
    />
  );
}
