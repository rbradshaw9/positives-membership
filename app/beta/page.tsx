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
  const offerLabel =
    inviteOffer === "free"
      ? "Free alpha access"
      : inviteOffer === "paid_test"
        ? "Billing test access"
        : inviteOffer === "discount"
          ? "Discounted beta access"
          : "Private invite access";
  const checkoutNote =
    inviteOffer === "free"
      ? "Enter the promo code at checkout. Your total should be $0 during the alpha period."
      : inviteOffer === "paid_test"
        ? "This path uses a real payment so we can test Stripe, billing emails, and account access end to end."
        : inviteOffer === "discount"
          ? "Enter the promo code at checkout to apply your beta discount."
          : "Complete checkout normally so we can validate the real member path.";
  const gettingStartedSteps = [
    "Choose the membership level you want to test.",
    promoCode ? "Enter your promo code in Stripe Checkout." : "Complete checkout with your normal card.",
    "Check your email, sign in, and start using Positives.",
    "Send feedback from inside the app whenever something feels unclear.",
  ];

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#F8F5EF" }}>
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
            style={{
              paddingTop: "clamp(3rem, 7vw, 5.5rem)",
              paddingBottom: "clamp(3rem, 6vw, 5rem)",
            }}
          >
            <div className="mx-auto max-w-4xl text-center">
              <p
                className="text-xs font-semibold uppercase mb-4"
                style={{ color: "#4E8C78", letterSpacing: "0.16em" }}
              >
                Private {cohortLabel} Invite
              </p>
              <h1
                className="font-heading font-bold"
                style={{
                  fontSize: "clamp(2.4rem, 6vw, 5rem)",
                  letterSpacing: "-0.055em",
                  lineHeight: "1.01",
                  color: "#121417",
                  textWrap: "balance",
                }}
              >
                Welcome to the early Positives release.
              </h1>
              <p
                className="mx-auto mt-5 max-w-2xl"
                style={{ fontSize: "1.05rem", color: "#5F6670", lineHeight: "1.78" }}
              >
                You are helping us test the real member experience before public launch.
                Start by choosing your access level below, then use Positives naturally and
                send feedback whenever something feels confusing, broken, or especially helpful.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: "Use it naturally",
                  body: "Try Today, Practice, Library, account, and billing like a real member.",
                },
                {
                  title: "Tell us what feels confusing",
                  body: "Use the feedback button for bugs, awkward copy, confusing moments, or ideas.",
                },
                {
                  title: "Expect small changes",
                  body: "Small fixes and content updates will happen during the early release.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.45rem] border p-4"
                  style={{
                    background: "rgba(255,255,255,0.86)",
                    borderColor: "rgba(221,215,207,0.74)",
                  }}
                >
                  <h2
                    className="font-heading font-semibold"
                    style={{
                      fontSize: "1rem",
                      color: "#121417",
                      lineHeight: "1.12",
                      textWrap: "balance",
                    }}
                  >
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: "#68707A", lineHeight: "1.62" }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            <section
              className="mt-8 rounded-[2rem] border p-5 sm:p-7"
              style={{
                background: "rgba(255,255,255,0.94)",
                borderColor: "rgba(221,215,207,0.78)",
                boxShadow: "0 24px 80px rgba(18,20,23,0.08)",
              }}
            >
              <div className="grid gap-7 lg:grid-cols-[1fr_0.82fr] lg:items-start">
                <div>
                  <p
                    className="text-xs font-semibold uppercase"
                    style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
                  >
                    How to get started
                  </p>
                  <h2
                    className="mt-3 font-heading font-bold tracking-[-0.045em]"
                    style={{
                      color: "#121417",
                      fontSize: "clamp(1.9rem, 4vw, 3.1rem)",
                      lineHeight: "1.06",
                      textWrap: "balance",
                    }}
                  >
                    Choose a level, use your invite, then start practicing.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm" style={{ color: "#68707A", lineHeight: "1.75" }}>
                    The signup flow uses the real Positives account path, so we can test what
                    invited members will actually experience before launch.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {gettingStartedSteps.map((step, index) => (
                      <div key={step} className="flex gap-3">
                        <span
                          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{ background: "#121417", color: "#FFFFFF" }}
                        >
                          {index + 1}
                        </span>
                        <p className="text-sm" style={{ color: "#4A5360", lineHeight: "1.6" }}>
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="rounded-[1.7rem] border p-5"
                  style={{
                    background: "linear-gradient(180deg, rgba(47,111,237,0.06), rgba(46,196,182,0.06))",
                    borderColor: "rgba(47,111,237,0.16)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase"
                    style={{ color: "#2F6FED", letterSpacing: "0.12em" }}
                  >
                    Your invite
                  </p>
                  <h3
                    className="mt-3 font-heading font-bold tracking-[-0.04em]"
                    style={{ color: "#121417", fontSize: "1.65rem", lineHeight: "1.08", textWrap: "balance" }}
                  >
                    {offerLabel}
                  </h3>
                  {promoCode ? (
                    <div
                      className="mt-4 rounded-[1.2rem] border p-4"
                      style={{
                        background: "rgba(255,255,255,0.78)",
                        borderColor: "rgba(47,111,237,0.18)",
                      }}
                    >
                      <p
                        className="text-xs font-semibold uppercase"
                        style={{ color: "#2F6FED", letterSpacing: "0.12em" }}
                      >
                        Promo code
                      </p>
                      <p className="mt-2 break-all font-mono text-lg font-semibold" style={{ color: "#121417" }}>
                        {promoCode}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="mt-4 rounded-[1.2rem] border p-4"
                      style={{
                        background: "rgba(255,255,255,0.78)",
                        borderColor: "rgba(78,140,120,0.18)",
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: "#121417" }}>
                        No promo code needed.
                      </p>
                      <p className="mt-1 text-sm" style={{ color: "#68707A", lineHeight: "1.65" }}>
                        Choose a plan and complete checkout normally.
                      </p>
                    </div>
                  )}
                  <p className="mt-4 text-sm" style={{ color: "#4A5360", lineHeight: "1.72" }}>
                    {checkoutNote}
                  </p>
                </div>
              </div>
            </section>

            <section
              className="mt-8 rounded-[2rem] border p-5 sm:p-7"
              style={{
                background: "rgba(255,255,255,0.94)",
                borderColor: "rgba(221,215,207,0.78)",
                boxShadow: "0 24px 80px rgba(18,20,23,0.08)",
              }}
            >
              <div className="mx-auto max-w-3xl text-center">
                <p
                  className="text-xs font-semibold uppercase"
                  style={{ color: "#4E8C78", letterSpacing: "0.16em" }}
                >
                  Select a plan
                </p>
                <h2
                  className="mt-3 font-heading font-bold tracking-[-0.045em] text-foreground"
                  style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", lineHeight: "1.06", textWrap: "balance" }}
                >
                  Choose the level you want to try.
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm" style={{ color: "#68707A", lineHeight: "1.75" }}>
                  Pick the level that best matches what you want to test. The cards have room
                  to breathe here, so you can compare them before going to checkout.
                </p>
              </div>

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
                  showCoachingCta={false}
                />
              </div>
            </section>

            <div
              className="mx-auto mt-8 max-w-3xl rounded-[1.5rem] border p-5 text-center"
              style={{
                background: "rgba(46,196,182,0.08)",
                borderColor: "rgba(46,196,182,0.22)",
              }}
            >
              <p className="font-heading font-semibold" style={{ color: "#121417", textWrap: "balance" }}>
                After you join, use Positives like a normal member.
              </p>
              <p className="mt-2 text-sm" style={{ color: "#68707A", lineHeight: "1.7" }}>
                Short, honest feedback is perfect. Tell us what is clear, confusing, helpful,
                awkward, or broken from inside the app.
              </p>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter paidHref="/beta" session={publicSession} />
    </div>
  );
}
