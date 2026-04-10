import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/marketing/Logo";
import { appendPublicTrackingParams, type PublicSearchParams } from "@/lib/marketing/public-query-params";
import { getPublicSessionState } from "@/lib/marketing/public-session";

type CtaMode = "paid" | "watch" | "trial";

type PartnerPageConfig = {
  slug: string;
  metadataTitle: string;
  metadataDescription: string;
  heroKicker: string;
  heroTitle: string;
  heroBody: string;
  partnerName?: string;
  eventName?: string;
  relevanceTitle: string;
  relevanceBody: string;
  proofQuote: string;
  proofAttribution: string;
  ctaMode: CtaMode;
  ctaNote: string;
  videoEmbedUrl?: string;
};

const PARTNER_PAGES: Record<string, PartnerPageConfig> = {
  "april-webinar": {
    slug: "april-webinar",
    metadataTitle: "April Webinar Replay — Positives",
    metadataDescription:
      "A webinar-specific Positives page for visitors who want a calmer daily practice after hearing Dr. Paul teach live.",
    heroKicker: "Webinar replay follow-up",
    heroTitle: "If the April webinar resonated, this is the daily practice that keeps it alive.",
    heroBody:
      "You already heard the core idea. Positives turns that same kind of guidance into a few grounded minutes each day so the shift keeps compounding after the webinar ends.",
    partnerName: "April Webinar",
    eventName: "A More Positive Life Webinar",
    relevanceTitle: "Why this page exists",
    relevanceBody:
      "People coming from a webinar do not need a generic homepage. They need a calm bridge from borrowed trust into a real next step. This page keeps the language specific, the context warm, and the path clear.",
    proofQuote:
      "Positives is the structured version of the mindset work people keep asking Dr. Paul how to actually practice every day.",
    proofAttribution: "Built for webinar, workshop, and live teaching follow-up",
    ctaMode: "trial",
    ctaNote: "Best for audiences who want to experience the rhythm before paying.",
  },
  "podcast-feature": {
    slug: "podcast-feature",
    metadataTitle: "Podcast Listener Page — Positives",
    metadataDescription:
      "A trust-heavy Positives path for listeners who heard Dr. Paul on a podcast and want more context before joining.",
    heroKicker: "Podcast follow-up",
    heroTitle: "If you just heard Dr. Paul on a podcast, start here.",
    heroBody:
      "This page is built for listeners who already like Dr. Paul’s voice and want a more story-driven next step before choosing a membership.",
    partnerName: "Podcast Listener",
    relevanceTitle: "A warmer path",
    relevanceBody:
      "Podcast traffic is usually warmer than cold ads but still needs more context than a pricing page alone. This route keeps the trust signal strong and sends people into the VSL path first.",
    proofQuote:
      "The VSL route gives warmer audiences the emotional buy-in and clarity they usually need before they become paying members.",
    proofAttribution: "Recommended for podcast, email, and retargeting traffic",
    ctaMode: "watch",
    ctaNote: "Best for warmer audiences who want to hear directly from Dr. Paul before buying.",
  },
  "partner-intro": {
    slug: "partner-intro",
    metadataTitle: "Partner Page — Positives",
    metadataDescription:
      "A co-branded Positives landing page for partner referrals, creator collaborations, and direct recommendation traffic.",
    heroKicker: "Partner recommendation",
    heroTitle: "You were sent here for a reason.",
    heroBody:
      "This page is for people arriving through a trusted recommendation. If someone you respect thought Positives would help, this is the clearest way to see what it is and choose the right level.",
    partnerName: "Partner Referral",
    relevanceTitle: "Borrowed trust, handled well",
    relevanceBody:
      "Partner traffic should feel intentionally welcomed instead of dumped onto a generic page. This template keeps the context specific without creating a bespoke build every time.",
    proofQuote:
      "A few calm minutes each day can make the rest of the day feel dramatically more livable.",
    proofAttribution: "Recommended for creator and affiliate partner campaigns",
    ctaMode: "paid",
    ctaNote: "Best for warm partner audiences ready for a direct paid offer.",
  },
};

function getVideoEmbed(url: string | undefined) {
  if (!url) return null;

  const trimmed = url.trim();
  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/i
  );

  if (youtubeMatch) {
    return `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1`;
  }

  const vimeoMatch = trimmed.match(
    /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i
  );

  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0&dnt=1`;
  }

  return null;
}

export function generateStaticParams() {
  return Object.keys(PARTNER_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = PARTNER_PAGES[slug];

  if (!page) {
    return {
      title: "Partner Page — Positives",
    };
  }

  return {
    title: page.metadataTitle,
    description: page.metadataDescription,
    alternates: {
      canonical: `/with/${page.slug}`,
    },
  };
}

function getModeTarget(mode: CtaMode) {
  if (mode === "trial") return "/try";
  if (mode === "watch") return "/watch";
  return "/join";
}

export default async function PartnerLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<PublicSearchParams>;
}) {
  const { slug } = await params;
  const page = PARTNER_PAGES[slug];

  if (!page) {
    notFound();
  }

  const session = await getPublicSessionState();
  const resolvedSearchParams = await searchParams;
  const signInHref = session.signInHref;
  const primaryHref = session.hasMemberAccess
    ? "/today"
    : appendPublicTrackingParams(getModeTarget(page.ctaMode), resolvedSearchParams);
  const paidHref = appendPublicTrackingParams(session.paidHref, resolvedSearchParams);
  const videoSrc = getVideoEmbed(page.videoEmbedUrl);

  return (
    <div className="min-h-dvh" style={{ background: "#F6F3EE" }}>
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(246,243,238,0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(221,215,207,0.65)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8 sm:py-4">
          <Logo kind="wordmark" height={24} />
          <div className="flex items-center gap-3">
            <Link href={signInHref} className="text-sm font-medium" style={{ color: "#68707A" }}>
              {session.signInLabel}
            </Link>
            <Link
              href={primaryHref}
              className="rounded-full px-4 py-2 text-sm font-semibold sm:px-5 sm:py-2.5"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 4px 14px rgba(47,111,237,0.28)",
                letterSpacing: "-0.01em",
              }}
            >
              {session.hasMemberAccess ? "Open Today" : page.ctaMode === "trial" ? "Start Free Trial" : page.ctaMode === "watch" ? "Watch Dr. Paul" : "Join Positives"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b" style={{ borderColor: "rgba(221,215,207,0.72)" }}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(47,111,237,0.08) 0%, transparent 62%)",
            }}
          />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center lg:py-20">
            <div>
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
              >
                {page.heroKicker}
              </p>
              <h1
                className="mt-4 font-heading text-4xl font-bold tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl"
                style={{ lineHeight: "1.02", textWrap: "balance" }}
              >
                {page.heroTitle}
              </h1>
              <p
                className="mt-5 max-w-2xl text-base sm:text-lg"
                style={{ color: "#68707A", lineHeight: "1.8", letterSpacing: "-0.01em" }}
              >
                {page.heroBody}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {page.partnerName ? (
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase"
                    style={{
                      background: "rgba(78,140,120,0.12)",
                      color: "#4E8C78",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {page.partnerName}
                  </span>
                ) : null}
                {page.eventName ? (
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase"
                    style={{
                      background: "rgba(47,111,237,0.1)",
                      color: "#2F6FED",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {page.eventName}
                  </span>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={primaryHref}
                  className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold"
                  style={{
                    background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                    color: "#FFFFFF",
                    boxShadow: "0 8px 28px rgba(47,111,237,0.26)",
                  }}
                >
                  {session.hasMemberAccess
                    ? "Open today's practice →"
                    : page.ctaMode === "trial"
                    ? "Start 7-day free trial →"
                    : page.ctaMode === "watch"
                    ? "Watch Dr. Paul →"
                    : "Choose your level →"}
                </Link>
                <Link
                  href={paidHref}
                  className="inline-flex items-center justify-center rounded-full border px-6 py-3.5 text-sm font-semibold"
                  style={{
                    borderColor: "rgba(18,20,23,0.12)",
                    color: "#121417",
                    background: "#FFFFFF",
                  }}
                >
                  {session.hasMemberAccess ? "Open member dashboard" : "See paid options"}
                </Link>
              </div>

              <p className="mt-4 text-sm" style={{ color: "#9AA0A8", lineHeight: "1.7" }}>
                {session.hasMemberAccess
                  ? "You can browse this page normally, but your member access is already active."
                  : page.ctaNote}
              </p>
            </div>

            <div
              className="rounded-[2rem] border p-6 sm:p-7"
              style={{
                background: "#10151D",
                borderColor: "rgba(18,20,23,0.08)",
                boxShadow: "0 24px 80px rgba(18,20,23,0.12)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: "#7DB3F7", letterSpacing: "0.14em" }}
              >
                Why this route works
              </p>
              <h2
                className="mt-4 font-heading text-3xl font-bold tracking-[-0.04em] text-white"
                style={{ lineHeight: "1.08", textWrap: "balance" }}
              >
                {page.relevanceTitle}
              </h2>
              <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.72)", lineHeight: "1.8" }}>
                {page.relevanceBody}
              </p>

              {videoSrc ? (
                <div className="mt-8 aspect-video overflow-hidden rounded-[1.5rem] bg-black">
                  <iframe
                    src={videoSrc}
                    title={`${page.heroTitle} video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                </div>
              ) : (
                <div
                  className="mt-8 rounded-[1.5rem] border p-5"
                  style={{
                    borderColor: "rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <p className="text-xs font-semibold uppercase" style={{ color: "#9AA0A8", letterSpacing: "0.12em" }}>
                    Template slot
                  </p>
                  <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.72)", lineHeight: "1.75" }}>
                    This template supports an optional webinar replay or partner video block without
                    requiring a bespoke page build every time.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section style={{ background: "#FFFFFF", borderBottom: "1px solid rgba(221,215,207,0.75)" }}>
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-18">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <article
                className="rounded-[1.75rem] border p-6"
                style={{
                  borderColor: "rgba(221,215,207,0.8)",
                  background: "#FDFBF8",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase"
                  style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
                >
                  Context-specific proof
                </p>
                <p
                  className="mt-4 font-heading text-2xl font-bold tracking-[-0.04em] text-foreground"
                  style={{ lineHeight: "1.12", textWrap: "balance" }}
                >
                  “{page.proofQuote}”
                </p>
                <p className="mt-4 text-sm" style={{ color: "#68707A", lineHeight: "1.75" }}>
                  {page.proofAttribution}
                </p>
              </article>

              <article
                className="rounded-[1.75rem] border p-6"
                style={{
                  borderColor: "rgba(221,215,207,0.8)",
                  background: "#FFFFFF",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase"
                  style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
                >
                  CTA mode
                </p>
                <h2
                  className="mt-4 font-heading text-2xl font-bold tracking-[-0.04em] text-foreground"
                  style={{ lineHeight: "1.12", textWrap: "balance" }}
                >
                  {page.ctaMode === "trial"
                    ? "Trial-first follow-up"
                    : page.ctaMode === "watch"
                    ? "Trust-first follow-up"
                    : "Direct paid follow-up"}
                </h2>
                <p className="mt-4 text-sm" style={{ color: "#68707A", lineHeight: "1.75" }}>
                  The template only supports paid, VSL, or trial CTA paths so the offer stack stays
                  disciplined and comparable over time.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
