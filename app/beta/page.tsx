import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";
import { config } from "@/lib/config";
import { BetaPageExperience } from "./BetaPageExperience";

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

export default function BetaPage() {
  const publicSession = ANONYMOUS_PUBLIC_SESSION_STATE;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#F8F5EF" }}>
      <PublicSiteHeader
        signInHref={publicSession.signInHref}
        signInLabel={publicSession.signInLabel}
        navLinks={[{ href: "/", label: "Home" }]}
      />

      <BetaPageExperience
        alphaFreePromoCode={config.launch.alphaFreePromoCode}
        betaDiscountPromoCode={config.launch.betaDiscountPromoCode}
        level1Monthly={config.stripe.prices.level1Monthly}
        level1Annual={config.stripe.prices.level1Annual}
        level2Monthly={config.stripe.prices.level2Monthly}
        level2Annual={config.stripe.prices.level2Annual}
        level3Monthly={config.stripe.prices.level3Monthly}
        level3Annual={config.stripe.prices.level3Annual}
      />

      <PublicSiteFooter paidHref="/beta" session={publicSession} />
    </div>
  );
}
