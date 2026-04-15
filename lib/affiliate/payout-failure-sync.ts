import { syncAffiliatePayoutFailed } from "@/lib/activecampaign/sync";
import { getPromoterPayouts } from "@/lib/firstpromoter/client";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

type AffiliateMemberRow = {
  id: string;
  email: string;
  fp_promoter_id: number | null;
  paypal_email: string | null;
};

type ExistingAlertRow = {
  id: string;
  ac_synced_at: string | null;
  resolved_at: string | null;
};

const FAILED_PAYOUT_STATES = new Set([
  "failed",
  "failure",
  "error",
  "errored",
  "denied",
  "declined",
  "rejected",
  "returned",
  "canceled",
  "cancelled",
]);

export function isFailedAffiliatePayoutState(state: string | null | undefined) {
  return FAILED_PAYOUT_STATES.has((state ?? "").trim().toLowerCase());
}

function fallbackPayoutError(state: string) {
  const normalized = state.trim();
  return normalized ? `FirstPromoter payout state: ${normalized}` : "FirstPromoter payout failed.";
}

export async function syncFailedAffiliatePayouts() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: members, error } = await supabase
    .from("member")
    .select<AffiliateMemberRow[]>("id, email, fp_promoter_id, paypal_email")
    .not("fp_promoter_id", "is", null);

  if (error) {
    throw new Error(`Could not load affiliate members: ${error.message}`);
  }

  const result = {
    scannedPromoters: 0,
    failedPayoutsFound: 0,
    alertsCreated: 0,
    activeCampaignSynced: 0,
    errors: 0,
  };

  for (const member of members ?? []) {
    if (!member.fp_promoter_id) continue;
    result.scannedPromoters += 1;

    try {
      const payouts = await getPromoterPayouts(member.fp_promoter_id);
      const failedPayouts = payouts.filter((payout) => isFailedAffiliatePayoutState(payout.state));

      for (const payout of failedPayouts) {
        result.failedPayoutsFound += 1;
        const payoutId = String(payout.id);
        const failedAt = payout.created_at ?? new Date().toISOString();
        const payoutError = payout.error ?? fallbackPayoutError(payout.state);

        const { data: existing } = await supabase
          .from("affiliate_payout_alert")
          .select<ExistingAlertRow>("id, ac_synced_at, resolved_at")
          .eq("fp_promoter_id", member.fp_promoter_id)
          .eq("fp_payout_id", payoutId)
          .maybeSingle();

        if (!existing) {
          const { error: insertError } = await supabase.from("affiliate_payout_alert").insert({
            member_id: member.id,
            fp_promoter_id: member.fp_promoter_id,
            fp_payout_id: payoutId,
            payout_state: payout.state,
            payout_error: payoutError,
            payout_amount: payout.amount,
            payout_email: member.paypal_email,
            metadata: { source: "firstpromoter_payout_scan" },
          });

          if (insertError) {
            console.error("[affiliate-payouts] alert insert failed:", insertError.message);
            result.errors += 1;
            continue;
          }

          result.alertsCreated += 1;
        } else {
          const { error: updateError } = await supabase
            .from("affiliate_payout_alert")
            .update({
              last_seen_at: new Date().toISOString(),
              payout_state: payout.state,
              payout_error: payoutError,
              payout_amount: payout.amount,
              payout_email: member.paypal_email,
            })
            .eq("id", existing.id);

          if (updateError) {
            console.error("[affiliate-payouts] alert update failed:", updateError.message);
            result.errors += 1;
          }
        }

        const shouldSyncToActiveCampaign = !existing?.ac_synced_at || existing.resolved_at;
        if (!shouldSyncToActiveCampaign) continue;

        await syncAffiliatePayoutFailed({
          email: member.email,
          payoutError,
          payoutEmail: member.paypal_email,
          failedAt,
          payoutAmount: payout.amount,
        });

        const { error: syncUpdateError } = await supabase
          .from("affiliate_payout_alert")
          .update({
            ac_synced_at: new Date().toISOString(),
            resolved_at: null,
          })
          .eq("fp_promoter_id", member.fp_promoter_id)
          .eq("fp_payout_id", payoutId);

        if (syncUpdateError) {
          console.error("[affiliate-payouts] AC sync marker update failed:", syncUpdateError.message);
          result.errors += 1;
          continue;
        }

        result.activeCampaignSynced += 1;
      }
    } catch (error) {
      console.error("[affiliate-payouts] promoter scan failed:", {
        promoterId: member.fp_promoter_id,
        error,
      });
      result.errors += 1;
    }
  }

  return result;
}
