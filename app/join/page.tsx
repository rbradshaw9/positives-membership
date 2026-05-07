import { config } from "@/lib/config";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";
import { JoinPageExperience } from "./JoinPageExperience";

type JoinPageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = {
  title: "Join Positives — Start Your Practice",
  description:
    "Start your Positives practice from $37/month. Daily guided audio, weekly principles, and monthly themes with Dr. Paul Jenkins.",
  alternates: {
    canonical: "/join",
  },
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function JoinPage({
  searchParams,
}: {
  searchParams?: JoinPageSearchParams;
}) {
  const publicSession = ANONYMOUS_PUBLIC_SESSION_STATE;
  const params = (await searchParams) ?? {};

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden" style={{ background: "#FAFAF8" }}>
      <PublicSiteHeader
        signInHref={publicSession.signInHref}
        signInLabel={publicSession.signInLabel}
        navLinks={[{ href: "/", label: "Home" }]}
      />

      <JoinPageExperience
        level1Monthly={config.stripe.prices.level1Monthly}
        level1Annual={config.stripe.prices.level1Annual}
        level2Monthly={config.stripe.prices.level2Monthly}
        level2Annual={config.stripe.prices.level2Annual}
        level3Monthly={config.stripe.prices.level3Monthly}
        level3Annual={config.stripe.prices.level3Annual}
        initialStep={firstSearchParam(params.step)}
        initialEmail={firstSearchParam(params.email)}
        initialError={firstSearchParam(params.error)}
      />

      <PublicSiteFooter
        paidHref={publicSession.paidHref}
        session={publicSession}
      />
    </div>
  );
}
