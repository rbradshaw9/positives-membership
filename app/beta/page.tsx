import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { PricingToggle } from "@/components/marketing/PricingToggle";
import { getPublicSessionState } from "@/lib/marketing/public-session";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { config } from "@/lib/config";
import {
  getInviteLaunchSource,
  normalizeLaunchAccessOffer,
  resolveLaunchContext,
} from "@/lib/launch/context";

export const metadata: Metadata = {
  title: "Private Beta — Positives",
  description:
    "Private beta access for invited Positives members and testers.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/beta",
  },
};

export default async function BetaPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; code?: string; offer?: string }>;
}) {
  const params = await searchParams;
  const requestedCohort = params.cohort === "alpha" ? "alpha" : "beta";
  const defaultOffer = requestedCohort === "alpha" ? "free" : "discount";
  const inviteOffer = normalizeLaunchAccessOffer(params.offer, defaultOffer);
  const fallbackSource = getInviteLaunchSource(requestedCohort, inviteOffer);
  const launchContext = resolveLaunchContext({
    cohort: requestedCohort,
    campaignCode: params.code ?? null,
    fallbackCohort: requestedCohort,
    fallbackSource,
  });
  const promoCode =
    inviteOffer === "free"
      ? config.launch.alphaFreePromoCode
      : inviteOffer === "discount"
        ? config.launch.betaDiscountPromoCode
        : "";
  const publicSession = await getPublicSessionState();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: member } = await supabase
      .from("member")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    if (hasActiveMemberAccess(member?.subscription_status)) {
      redirect("/today");
    }
  }

  const cohortLabel = launchContext.launchCohort === "alpha" ? "Alpha" : "Beta";
  const inviteHeadline =
    inviteOffer === "free"
      ? "Your invite includes free access so you can focus on the product, not the billing."
      : inviteOffer === "paid_test"
        ? "This invite is for our billing-test group, so we can validate the real paid path before launch."
        : inviteOffer === "discount"
          ? "Your invite uses the real paid path, with a beta discount when available."
          : "Your invite uses the real signup and billing path so we get honest launch signal.";
  const inviteSupportCopy =
    inviteOffer === "free"
      ? "Use the promotion code shown below in Stripe Checkout. A zero-dollar alpha checkout still creates the real account, entitlement, and webhook trail, but it will not collect a payment method."
      : inviteOffer === "paid_test"
        ? "Please complete checkout with your normal card. This group helps us test real Stripe billing, portal behavior, prorations, and support edge cases before a wider rollout."
        : inviteOffer === "discount"
          ? "If your invite includes a promo code, enter it in Stripe Checkout so we can keep you on the real production path while honoring your beta rate."
          : "Use the normal checkout flow so we validate the same activation, billing, and support path live members will use.";
  const inviteLinkPath =
    inviteOffer === "free"
      ? `/beta?cohort=${launchContext.launchCohort}&offer=free${launchContext.launchCampaignCode ? `&code=${launchContext.launchCampaignCode}` : ""}`
      : inviteOffer === "paid_test"
        ? `/beta?cohort=${launchContext.launchCohort}&offer=paid-test${launchContext.launchCampaignCode ? `&code=${launchContext.launchCampaignCode}` : ""}`
        : inviteOffer === "discount"
          ? `/beta?cohort=${launchContext.launchCohort}&offer=discount${launchContext.launchCampaignCode ? `&code=${launchContext.launchCampaignCode}` : ""}`
          : `/beta?cohort=${launchContext.launchCohort}${launchContext.launchCampaignCode ? `&code=${launchContext.launchCampaignCode}` : ""}`;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#F7F4EE" }}>
      <PublicSiteHeader
        signInHref={publicSession.signInHref}
        signInLabel={publicSession.signInLabel}
        navLinks={[{ href: "/", label: "Home" }]}
      />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at top, rgba(46,196,182,0.16), transparent 42%), radial-gradient(circle at 85% 15%, rgba(61,182,231,0.12), transparent 32%)",
            }}
          />

          <div
            className="relative mx-auto max-w-6xl px-5 sm:px-8"
            style={{ paddingTop: "clamp(4rem, 8vw, 6.5rem)", paddingBottom: "clamp(3rem, 6vw, 5rem)" }}
          >
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div>
                <p
                  className="text-xs font-semibold uppercase mb-5"
                  style={{ color: "#4E8C78", letterSpacing: "0.16em" }}
                >
                  Private {cohortLabel}
                </p>
                <h1
                  className="font-heading font-bold"
                  style={{
                    fontSize: "clamp(2.4rem, 5.6vw, 4.8rem)",
                    letterSpacing: "-0.055em",
                    lineHeight: "1.01",
                    color: "#121417",
                    textWrap: "balance",
                    maxWidth: "10ch",
                  }}
                >
                  You’re invited to help shape Positives before launch.
                </h1>
                <p
                  className="mt-5 max-w-2xl"
                  style={{ fontSize: "1.03rem", color: "#5F6670", lineHeight: "1.82" }}
                >
                  This is the real product, not a demo. We want honest usage, real friction,
                  and fast signal on what feels calm, useful, awkward, incomplete, or broken.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      title: "Use it naturally",
                      body: "Try Today, My Practice, the Library, and the account/billing flow the way you normally would.",
                    },
                    {
                      title: "Tell us what happens",
                      body: "Use the in-app beta feedback button for bugs, awkward UX, confusing copy, or missing pieces.",
                    },
                    {
                      title: "Expect iteration",
                      body: "Some edges will move quickly during beta. That’s part of what makes this valuable.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[1.75rem] border p-5"
                      style={{
                        background: "rgba(255,255,255,0.88)",
                        borderColor: "rgba(221,215,207,0.74)",
                        boxShadow: "0 10px 28px rgba(18,20,23,0.05)",
                      }}
                    >
                      <p className="font-heading font-semibold" style={{ fontSize: "1.05rem", color: "#121417" }}>
                        {item.title}
                      </p>
                      <p className="mt-3 text-sm" style={{ color: "#68707A", lineHeight: "1.72" }}>
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  className="mt-8 rounded-[1.8rem] border p-5 sm:p-6"
                  style={{
                    background: "rgba(255,255,255,0.84)",
                    borderColor: "rgba(46,196,182,0.28)",
                    boxShadow: "0 12px 32px rgba(18,20,23,0.06)",
                  }}
                >
                  <p className="text-xs font-semibold uppercase" style={{ color: "#2F6FED", letterSpacing: "0.14em" }}>
                    Invite context
                  </p>
                  <p className="mt-3 text-sm font-semibold" style={{ color: "#121417", lineHeight: "1.7" }}>
                    {inviteHeadline}
                  </p>
                  <p className="mt-3 text-sm" style={{ color: "#4A5360", lineHeight: "1.75" }}>
                    Cohort: <span className="font-semibold" style={{ color: "#121417" }}>{launchContext.launchCohort}</span>
                    {" "}· access path:{" "}
                    <span className="font-semibold" style={{ color: "#121417" }}>
                      {inviteOffer === "free"
                        ? "free alpha"
                        : inviteOffer === "paid_test"
                          ? "paid billing test"
                          : inviteOffer === "discount"
                            ? "discounted beta"
                            : "standard invite"}
                    </span>
                    {launchContext.launchCampaignCode ? (
                      <>
                        {" "}· invite code:{" "}
                        <span className="font-mono text-[0.82rem]" style={{ color: "#121417" }}>
                          {launchContext.launchCampaignCode}
                        </span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-2 text-sm" style={{ color: "#68707A", lineHeight: "1.72" }}>
                    {inviteSupportCopy}
                  </p>
                  {promoCode ? (
                    <div
                      className="mt-4 rounded-[1.2rem] border px-4 py-3"
                      style={{
                        background: "rgba(47,111,237,0.05)",
                        borderColor: "rgba(47,111,237,0.18)",
                      }}
                    >
                      <p className="text-xs font-semibold uppercase" style={{ color: "#2F6FED", letterSpacing: "0.12em" }}>
                        Stripe promo code
                      </p>
                      <p className="mt-2 font-mono text-sm" style={{ color: "#121417" }}>
                        {promoCode}
                      </p>
                    </div>
                  ) : null}
                  <p className="mt-4 text-xs" style={{ color: "#8B929C", lineHeight: "1.65" }}>
                    Suggested invite link: <span className="font-mono">{inviteLinkPath}</span>
                  </p>
                </div>
              </div>

              <div
                className="rounded-[2rem] border p-6 sm:p-7"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  borderColor: "rgba(221,215,207,0.78)",
                  boxShadow: "0 24px 80px rgba(18,20,23,0.08)",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase"
                  style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
                >
                  Choose your access level
                </p>
                <h2
                  className="mt-4 font-heading font-bold text-3xl tracking-[-0.045em] text-foreground"
                  style={{ lineHeight: "1.08", textWrap: "balance" }}
                >
                  Start with the version of Positives you actually want to test.
                </h2>
                <p className="mt-4 text-sm" style={{ color: "#68707A", lineHeight: "1.8" }}>
                  We recommend using the same checkout and account flow real members will use, so we get honest signal on activation, billing, and support.
                </p>

                <div className="mt-7">
                  <PricingToggle
                    sourcePath="/beta"
                    launchCohort={launchContext.launchCohort}
                    launchSource={launchContext.launchSource}
                    launchCampaignCode={launchContext.launchCampaignCode}
                    level1Monthly={config.stripe.prices.level1Monthly}
                    level1Annual={config.stripe.prices.level1Annual}
                    level2Monthly={config.stripe.prices.level2Monthly}
                    level2Annual={config.stripe.prices.level2Annual}
                    level3Monthly={config.stripe.prices.level3Monthly}
                    level3Annual={config.stripe.prices.level3Annual}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter paidHref="/beta" session={publicSession} />
    </div>
  );
}
