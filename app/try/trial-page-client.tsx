"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { getGuestCheckoutUrl } from "@/app/join/actions";
import { PublicTrackedLink } from "@/components/marketing/PublicTrackedLink";
import { track } from "@/lib/analytics/ga";
import { getStoredFirstPromoterRefId } from "@/lib/firstpromoter/referral";

export type TrialPlanOption = {
  tier: "level_1" | "level_2" | "level_3";
  title: string;
  monthlyPrice: number;
  tagline: string;
  summary: string;
  priceId: string;
  isLive: boolean;
};

type TrialPageClientProps = {
  plans: TrialPlanOption[];
  hasMemberAccess: boolean;
  memberHref: string;
  paidHref: string;
};

const TIER_LABEL: Record<TrialPlanOption["tier"], string> = {
  level_1: "Membership",
  level_2: "Membership + Events",
  level_3: "Coaching Circle",
};

export function TrialPageClient({
  plans,
  hasMemberAccess,
  memberHref,
  paidHref,
}: TrialPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedTier, setSelectedTier] = useState<TrialPlanOption["tier"]>(() => {
    const firstLive = plans.find((plan) => plan.isLive) ?? plans[0];
    return firstLive?.tier ?? "level_1";
  });

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.tier === selectedTier) ?? plans[0],
    [plans, selectedTier]
  );

  useEffect(() => {
    track("trial_page_viewed", {
      source_path: "/try",
      offer_type: "trial_7_day",
      available_levels: plans.filter((plan) => plan.isLive).map((plan) => plan.tier).join(","),
    });
  }, [plans]);

  const handleCheckout = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPlan?.isLive) return;

    const formData = new FormData(event.currentTarget);
    const fpr = getStoredFirstPromoterRefId();

    if (fpr) {
      formData.set("fpr", fpr);
    }

    formData.set("priceId", selectedPlan.priceId);
    formData.set("trialPlanLevel", selectedPlan.tier);
    formData.set("trialPlanName", selectedPlan.title);

    track("begin_checkout", {
      source_path: "/try",
      offer_type: "trial_7_day",
      plan_level: selectedPlan.tier,
      price_id: selectedPlan.priceId,
      affiliate_attributed: Boolean(fpr),
      affiliate_code: fpr ?? undefined,
      value: 0,
      currency: "USD",
    });

    startTransition(async () => {
      const result = await getGuestCheckoutUrl(formData);
      if (result.url) {
        window.location.href = result.url;
        return;
      }

      track("checkout_error", {
        source_path: "/try",
        offer_type: "trial_7_day",
        plan_level: selectedPlan.tier,
        price_id: selectedPlan.priceId,
      });
    });
  };

  if (hasMemberAccess) {
    return (
      <>
        <div
          className="mt-8 rounded-[1.75rem] border bg-white p-6 sm:p-7"
          style={{
            borderColor: "rgba(221,215,207,0.8)",
            boxShadow: "0 10px 30px rgba(18,20,23,0.05)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase"
            style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
          >
            Already inside
          </p>
          <h2
            className="mt-4 font-heading text-2xl font-bold tracking-[-0.04em] text-foreground sm:text-3xl"
            style={{ lineHeight: "1.08", textWrap: "balance" }}
          >
            You already have access to Positives.
          </h2>
          <p className="mt-4 max-w-xl text-sm" style={{ color: "#68707A", lineHeight: "1.8" }}>
            Browse the trial page if you want, but your membership is already active. Jump back
            into today&apos;s practice whenever you&apos;re ready.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <PublicTrackedLink
              href={memberHref}
              className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 8px 28px rgba(47,111,237,0.24)",
              }}
            >
              Open today&apos;s practice →
            </PublicTrackedLink>
            <PublicTrackedLink
              href={paidHref}
              className="inline-flex items-center justify-center rounded-full border px-6 py-3.5 text-sm font-semibold"
              style={{
                borderColor: "rgba(18,20,23,0.12)",
                color: "#121417",
                background: "#FFFFFF",
              }}
            >
              View your membership options
            </PublicTrackedLink>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mt-8 grid gap-4">
        {plans.map((plan) => {
          const isSelected = plan.tier === selectedPlan?.tier;
          return (
            <button
              key={plan.tier}
              type="button"
              onClick={() => plan.isLive && setSelectedTier(plan.tier)}
              disabled={!plan.isLive}
              className="w-full rounded-[1.75rem] border p-5 text-left transition-all sm:p-6"
              style={{
                borderColor: isSelected ? "rgba(47,111,237,0.42)" : "rgba(221,215,207,0.85)",
                background: isSelected ? "rgba(47,111,237,0.05)" : "#FFFFFF",
                boxShadow: isSelected ? "0 10px 30px rgba(47,111,237,0.12)" : "0 6px 18px rgba(18,20,23,0.04)",
                opacity: plan.isLive ? 1 : 0.58,
                cursor: plan.isLive ? "pointer" : "not-allowed",
              }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p
                    className="text-xs font-semibold uppercase"
                    style={{ color: isSelected ? "#2F6FED" : "#4E8C78", letterSpacing: "0.14em" }}
                  >
                    {TIER_LABEL[plan.tier]}
                  </p>
                  <h2
                    className="mt-3 font-heading text-2xl font-bold tracking-[-0.04em] text-foreground"
                    style={{ lineHeight: "1.08", textWrap: "balance" }}
                  >
                    {plan.title}
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: "#68707A", lineHeight: "1.75" }}>
                    {plan.tagline}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p
                    className="font-heading text-3xl font-bold tracking-[-0.04em] text-foreground"
                    style={{ lineHeight: "1" }}
                  >
                    ${plan.monthlyPrice}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase" style={{ color: "#9AA0A8", letterSpacing: "0.1em" }}>
                    per month after trial
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm" style={{ color: "#3F4650", lineHeight: "1.75" }}>
                {plan.summary}
              </p>
            </button>
          );
        })}
      </div>

      <div
        className="mt-6 rounded-[1.5rem] border p-5 sm:p-6"
        style={{
          background: "#FFFFFF",
          borderColor: "rgba(221,215,207,0.8)",
        }}
      >
        <p className="text-xs font-semibold uppercase" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
          Selected trial
        </p>
        <h2
          className="mt-3 font-heading text-2xl font-bold tracking-[-0.04em] text-foreground"
          style={{ lineHeight: "1.08", textWrap: "balance" }}
        >
          {selectedPlan.title}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#68707A", lineHeight: "1.75" }}>
          Today you pay nothing. On day 8, Stripe starts the same membership at $
          {selectedPlan.monthlyPrice}/month unless you cancel in the billing center first.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        {selectedPlan.isLive ? (
          <form onSubmit={handleCheckout} className="w-full sm:w-auto">
            <input type="hidden" name="priceId" value={selectedPlan.priceId} />
            <input type="hidden" name="checkoutMode" value="trial_7_day" />
            <input type="hidden" name="sourcePath" value="/try" />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full px-7 py-4 text-sm font-semibold sm:w-auto"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 10px 30px rgba(47,111,237,0.24)",
                letterSpacing: "-0.01em",
                opacity: isPending ? 0.82 : 1,
              }}
              disabled={isPending}
            >
              {isPending ? "Preparing your trial…" : `Start ${selectedPlan.title} free for 7 days →`}
            </button>
          </form>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex w-full items-center justify-center rounded-full px-7 py-4 text-sm font-semibold sm:w-auto"
            style={{
              background: "rgba(18,20,23,0.08)",
              color: "#9AA0A8",
              letterSpacing: "-0.01em",
              cursor: "not-allowed",
            }}
          >
            Trial checkout is being configured
          </button>
        )}

        <PublicTrackedLink
          href={paidHref}
          className="inline-flex items-center justify-center rounded-full border px-7 py-4 text-sm font-semibold"
          style={{
            borderColor: "rgba(18,20,23,0.12)",
            background: "#FFFFFF",
            color: "#121417",
          }}
        >
          Prefer the paid offer instead?
        </PublicTrackedLink>
      </div>

      <p className="mt-4 text-sm" style={{ color: "#9AA0A8", lineHeight: "1.7" }}>
        Card required today. Stripe saves it now and starts billing on day 8 for the level you
        choose unless you cancel first in the billing center.
      </p>
    </>
  );
}
