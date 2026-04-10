import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/marketing/Logo";
import { appendPublicTrackingParams, type PublicSearchParams } from "@/lib/marketing/public-query-params";
import { getPublicSessionState } from "@/lib/marketing/public-session";

export const metadata: Metadata = {
  title: "Watch Dr. Paul — Positives",
  description:
    "Watch Dr. Paul Jenkins explain the Positives daily practice and join when you're ready.",
};

function getVideoEmbed(url: string | undefined) {
  if (!url) return null;

  const trimmed = url.trim();

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/i
  );
  if (youtubeMatch) {
    return {
      provider: "youtube" as const,
      src: `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1`,
    };
  }

  const vimeoMatch = trimmed.match(
    /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i
  );
  if (vimeoMatch) {
    return {
      provider: "vimeo" as const,
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0&dnt=1`,
    };
  }

  return null;
}

function ValuePill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase"
      style={{
        color: "#4E8C78",
        background: "rgba(78,140,120,0.12)",
        letterSpacing: "0.12em",
      }}
    >
      {children}
    </span>
  );
}

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<PublicSearchParams>;
}) {
  const session = await getPublicSessionState();
  const resolvedSearchParams = await searchParams;
  const signInHref = session.signInHref;
  const paidHref = appendPublicTrackingParams(session.paidHref, resolvedSearchParams);
  const embed = getVideoEmbed(process.env.NEXT_PUBLIC_VSL_EMBED_URL);

  return (
    <div className="min-h-dvh" style={{ background: "#F6F3EE" }}>
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(246,243,238,0.88)",
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
              href={paidHref}
              className="rounded-full px-4 py-2 text-sm font-semibold sm:px-5 sm:py-2.5"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 4px 14px rgba(47,111,237,0.28)",
                letterSpacing: "-0.01em",
              }}
            >
              {session.hasMemberAccess ? "Open Today" : "Join Positives"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section
          className="relative overflow-hidden border-b"
          style={{ borderColor: "rgba(221,215,207,0.7)" }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(47,111,237,0.08) 0%, transparent 62%)",
            }}
          />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:py-20">
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                <ValuePill>Watch Dr. Paul</ValuePill>
                <ValuePill>Paid Membership Offer</ValuePill>
              </div>

              <h1
                className="font-heading text-4xl font-bold tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl"
                style={{ lineHeight: "1.02", textWrap: "balance" }}
              >
                Hear why a few minutes each day can change the rest of your life.
              </h1>

              <p
                className="mt-5 max-w-xl text-base sm:text-lg"
                style={{
                  color: "#68707A",
                  lineHeight: "1.78",
                  letterSpacing: "-0.01em",
                }}
              >
                This page is for the person who wants to hear directly from Dr. Paul Jenkins before
                joining. Positives is a calm daily practice for clearer thinking, steadier emotions,
                and a more grounded way to move through the day.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={paidHref}
                  className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold"
                  style={{
                    background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                    color: "#FFFFFF",
                    boxShadow: "0 8px 28px rgba(47,111,237,0.26)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {session.hasMemberAccess ? "Open today's practice →" : "Join Positives →"}
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
                  {session.paidSecondaryLabel}
                </Link>
              </div>

              <p className="mt-4 text-sm" style={{ color: "#9AA0A8" }}>
                Starts at $37/month · 30-day guarantee · Cancel anytime
              </p>
            </div>

            <div>
              <div
                className="overflow-hidden rounded-[2rem] border"
                style={{
                  borderColor: "rgba(18,20,23,0.08)",
                  background: "#10151D",
                  boxShadow: "0 24px 80px rgba(18,20,23,0.12)",
                }}
              >
                <div
                  className="border-b px-6 py-4"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <p
                    className="text-xs font-semibold uppercase"
                    style={{ color: "#7DB3F7", letterSpacing: "0.14em" }}
                  >
                    Dr. Paul Jenkins
                  </p>
                  <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.68)" }}>
                    Why Positives works, who it is for, and what changes when you return to a
                    simple daily practice.
                  </p>
                </div>

                {embed ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={embed.src}
                      title="Positives video sales letter"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  </div>
                ) : (
                  <div className="aspect-video px-6 py-8">
                    <div
                      className="flex h-full flex-col justify-between rounded-[1.5rem] border p-6"
                      style={{
                        borderColor: "rgba(255,255,255,0.08)",
                        background:
                          "radial-gradient(circle at 30% 20%, rgba(47,111,237,0.18) 0%, rgba(16,21,29,0.96) 52%)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <ValuePill>VSL slot ready</ValuePill>
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-full"
                          style={{ background: "rgba(255,255,255,0.08)" }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
                            <path d="M5 3l14 9-14 9V3z" />
                          </svg>
                        </div>
                      </div>

                      <div>
                        <h2
                          className="font-heading text-3xl font-bold tracking-[-0.04em] text-white"
                          style={{ lineHeight: "1.06", textWrap: "balance" }}
                        >
                          The VSL route is live and ready for the final Dr. Paul video.
                        </h2>
                        <p className="mt-4 max-w-md text-sm" style={{ color: "rgba(255,255,255,0.68)", lineHeight: "1.8" }}>
                          This block will switch to the approved video asset as soon as it is
                          available. The rest of the page is already built to support the direct
                          paid funnel.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          className="border-b"
          style={{ background: "#FFFFFF", borderColor: "rgba(221,215,207,0.75)" }}
        >
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-18">
            <div className="max-w-3xl">
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
              >
                What you are joining
              </p>
              <h2
                className="mt-4 font-heading text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl"
                style={{ lineHeight: "1.08", textWrap: "balance" }}
              >
                A daily practice, a weekly reflection, and a monthly theme that keeps everything connected.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  label: "Daily",
                  title: "Start your day with clarity",
                  body:
                    "Short guided audio from Dr. Paul to help you think clearly before stress gets loud.",
                  accent: "#2F6FED",
                },
                {
                  label: "Weekly",
                  title: "Reinforce one principle at a time",
                  body:
                    "A weekly reflection helps the practice sink in without making the platform feel like a course.",
                  accent: "#4E8C78",
                },
                {
                  label: "Monthly",
                  title: "Stay grounded in a bigger theme",
                  body:
                    "Each month has a guiding theme so the daily rhythm feels calm, coherent, and easy to return to.",
                  accent: "#D98A4E",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.75rem] border p-6"
                  style={{
                    borderColor: "rgba(221,215,207,0.8)",
                    background: "#FAFAF8",
                    boxShadow: "0 6px 18px rgba(18,20,23,0.04)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase"
                    style={{ color: item.accent, letterSpacing: "0.12em" }}
                  >
                    {item.label}
                  </p>
                  <h3
                    className="mt-3 font-heading text-2xl font-semibold tracking-[-0.03em] text-foreground"
                    style={{ lineHeight: "1.14", textWrap: "balance" }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm" style={{ color: "#68707A", lineHeight: "1.8" }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="border-b"
          style={{ background: "#121417", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:py-18">
            <div>
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: "#7DB3F7", letterSpacing: "0.14em" }}
              >
                Why people stay
              </p>
              <h2
                className="mt-4 font-heading text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl"
                style={{ lineHeight: "1.08", textWrap: "balance" }}
              >
                It helps people stop reacting all day and start returning to themselves on purpose.
              </h2>
            </div>

            <div className="space-y-4 text-sm" style={{ color: "#B5BDC7", lineHeight: "1.82" }}>
              {[
                "You do not need long sessions, complicated routines, or perfect consistency to feel the shift.",
                "You need something calm enough to return to, clear enough to trust, and useful enough to keep using.",
                "That is what Positives is designed to be.",
              ].map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: "#F6F3EE" }}>
          <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 lg:py-20">
            <p
              className="text-xs font-semibold uppercase"
              style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
            >
              Join when you are ready
            </p>
            <h2
              className="mx-auto mt-4 max-w-2xl font-heading text-3xl font-bold tracking-[-0.045em] text-foreground sm:text-4xl"
              style={{ lineHeight: "1.08", textWrap: "balance" }}
            >
              Start with the level that fits you today and come back to the practice tomorrow.
            </h2>
            <p
              className="mx-auto mt-5 max-w-2xl text-base"
              style={{ color: "#68707A", lineHeight: "1.8", letterSpacing: "-0.01em" }}
            >
              The simplest next step is to choose your membership level. The paid offer stays the
              same here as it does everywhere else: clear pricing, 30-day guarantee, and no support
              ticket required to manage your membership.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={paidHref}
                className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  color: "#FFFFFF",
                  boxShadow: "0 8px 28px rgba(47,111,237,0.26)",
                  letterSpacing: "-0.01em",
                }}
              >
                {session.hasMemberAccess ? "Open your member dashboard →" : "Choose your level →"}
              </Link>
              <Link href="/faq" className="text-sm font-medium" style={{ color: "#68707A" }}>
                Read the FAQ
              </Link>
            </div>

            <p className="mt-4 text-sm" style={{ color: "#9AA0A8" }}>
              Paid membership starts at $37/month · 30-day guarantee · cancel anytime
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
