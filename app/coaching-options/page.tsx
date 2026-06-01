import Image from "next/image";
import Link from "next/link";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";
import { CoachingCheckoutButton } from "./CoachingCheckoutButton";

const included = [
  "10 private coaching sessions with a Positivity Coach",
  "Flexible scheduling at your own pace",
  "Practical support for individuals or families",
  "Access to supportive course resources",
];

const coaches = [
  {
    name: "Dr. Paul Jenkins",
    title: "Clinical Psychologist and Positives founder",
    bio: "Dr. Paul brings practical, compassionate guidance for people who want a steadier way to think, respond, and move through everyday life.",
    image: "/Dr._Paul_Jenkins.jpg",
  },
  {
    name: "Positivity Coach",
    title: "Personal practice support",
    bio: "A Positives coach helps you apply the principles in real situations, with space to talk through patterns, goals, and next steps.",
    image: null,
  },
  {
    name: "Family Positivity Coach",
    title: "Support for home and relationships",
    bio: "For clients working through family dynamics, parenting patterns, or shared goals, coaching can help turn good intentions into small repeatable practices.",
    image: null,
  },
];

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
      aria-hidden="true"
      className="mt-1 flex-shrink-0"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export const metadata = {
  title: "Private Coaching Options - Positives",
  description:
    "Explore private coaching options through Positives, including a 10-session coaching pass, single sessions, and application-only group support.",
  alternates: {
    canonical: "/coaching-options",
  },
};

export default function CoachingOptionsPage() {
  const publicSession = ANONYMOUS_PUBLIC_SESSION_STATE;

  return (
    <div className="min-h-dvh overflow-x-hidden" style={{ background: "#FAFAF8" }}>
      <PublicSiteHeader
        signInHref={publicSession.signInHref}
        signInLabel={publicSession.signInLabel}
        primaryCtaHref="#purchase-options"
        primaryCtaLabel="View options"
        navLinks={[
          { href: "/join", label: "Membership", hiddenOnMobile: true },
          { href: "#team", label: "Meet your team" },
        ]}
      />

      <main>
        <section className="relative overflow-hidden border-b border-[rgba(221,215,207,0.65)]">
          <div
            className="absolute inset-x-0 bottom-0 h-36 opacity-70"
            aria-hidden="true"
            style={{
              background:
                "linear-gradient(180deg, rgba(250,250,248,0) 0%, rgba(246,243,238,0.96) 100%)",
            }}
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:py-20">
            <div>
              <p
                className="mb-5 text-xs font-semibold uppercase"
                style={{ color: "#4E8C78", letterSpacing: "0.13em" }}
              >
                Private coaching
              </p>
              <h1
                className="font-heading font-bold"
                style={{
                  color: "#121417",
                  fontSize: "clamp(2.35rem, 6vw, 5.2rem)",
                  lineHeight: "0.98",
                  letterSpacing: "-0.045em",
                  maxWidth: "10.5ch",
                  textWrap: "balance",
                }}
              >
                Personal support for real life.
              </h1>
              <p
                className="mt-6 max-w-xl text-base sm:text-lg"
                style={{ color: "#68707A", lineHeight: "1.75" }}
              >
                Work one-on-one with a Positives coach to apply what you are
                practicing, talk through what is happening now, and build
                steadier patterns over time.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <CoachingCheckoutButton packType="punch_pass">
                  Start your coaching pass
                </CoachingCheckoutButton>
                <a
                  href="#team"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[rgba(18,20,23,0.12)] bg-white px-6 py-3 text-sm font-semibold transition hover:border-[rgba(46,196,182,0.35)]"
                  style={{ color: "#121417" }}
                >
                  Meet your team
                </a>
              </div>
            </div>

            <div className="relative min-h-[430px] overflow-hidden rounded-[2rem] border border-[rgba(221,215,207,0.72)] bg-[#F6F3EE] shadow-[0_24px_80px_rgba(18,20,23,0.12)]">
              <Image
                src="/Dr._Paul_Jenkins.jpg"
                alt="Dr. Paul Jenkins"
                fill
                priority
                loading="eager"
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover object-[50%_18%]"
              />
              <div
                className="absolute inset-x-0 bottom-0 p-6 sm:p-8"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(18,20,23,0) 0%, rgba(18,20,23,0.78) 100%)",
                }}
              >
                <p className="max-w-sm text-sm font-medium text-white/92">
                  Coaching is designed to make the practice personal, concrete,
                  and easier to return to.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="purchase-options"
          className="w-full px-5 py-14 sm:px-8 sm:py-20"
          style={{ background: "#F6F3EE" }}
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 max-w-3xl">
              <p
                className="mb-3 text-xs font-semibold uppercase"
                style={{ color: "#8E959E", letterSpacing: "0.13em" }}
              >
                Coaching options
              </p>
              <h2
                className="font-heading font-bold"
                style={{
                  color: "#121417",
                  fontSize: "clamp(2rem, 4vw, 3.6rem)",
                  lineHeight: "1.04",
                  letterSpacing: "-0.045em",
                  textWrap: "balance",
                }}
              >
                Choose the amount of support that fits this season.
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.2fr_0.95fr]">
              <article className="flex flex-col rounded-2xl border border-[rgba(221,215,207,0.85)] bg-white p-6 shadow-[0_10px_30px_rgba(18,20,23,0.05)] sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#8E959E]">
                  Single session
                </p>
                <h3
                  className="mt-4 font-heading text-2xl font-bold"
                  style={{ color: "#121417", textWrap: "balance" }}
                >
                  One focused coaching conversation.
                </h3>
                <div className="mt-5">
                  <span className="font-heading text-4xl font-bold tracking-[-0.04em] text-[#121417]">
                    $225
                  </span>
                  <span className="ml-2 text-sm text-[#68707A]">per session</span>
                </div>
                <p className="mt-5 text-sm leading-7 text-[#68707A]">
                  A useful starting point when someone wants to try coaching,
                  talk through one specific situation, or get help choosing a
                  next step.
                </p>
                <CoachingCheckoutButton
                  packType="single"
                  variant="secondary"
                  className="mt-auto"
                >
                  Book a single session
                </CoachingCheckoutButton>
              </article>

              <article
                className="flex flex-col rounded-2xl border p-6 text-white shadow-[0_24px_70px_rgba(46,196,182,0.22)] sm:p-8"
                style={{
                  background:
                    "linear-gradient(145deg, #121417 0%, #123632 55%, #1A6B73 100%)",
                  borderColor: "rgba(255,255,255,0.14)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.13em] text-white/62">
                    Best fit for ongoing work
                  </p>
                  <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white">
                    10 sessions
                  </span>
                </div>
                <h3
                  className="mt-5 font-heading text-3xl font-bold text-white sm:text-4xl"
                  style={{ color: "#FFFFFF", textWrap: "balance" }}
                >
                  Private Coaching Pass
                </h3>
                <div className="mt-5">
                  <span className="font-heading text-5xl font-bold tracking-[-0.05em]">
                    $1,997
                  </span>
                  <span className="ml-2 text-sm text-white/62">
                    for 10 sessions
                  </span>
                </div>
                <ul className="mt-8 grid gap-4">
                  {included.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-white/82">
                      <span className="text-[#2EC4B6]">
                        <CheckIcon />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-sm leading-7 text-white/70">
                  A flexible coaching option for people who want practical,
                  personal, and purposeful support without a monthly commitment.
                </p>
                <div className="mt-8">
                  <CoachingCheckoutButton packType="punch_pass">
                    Start your coaching pass
                  </CoachingCheckoutButton>
                  <p className="mt-3 text-xs text-white/50">
                    Save compared to booking individually.
                  </p>
                </div>
              </article>

              <article className="flex flex-col rounded-2xl border border-[rgba(221,215,207,0.85)] bg-white p-6 shadow-[0_10px_30px_rgba(18,20,23,0.05)] sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#8E959E]">
                  Application only
                </p>
                <h3
                  className="mt-4 font-heading text-2xl font-bold"
                  style={{ color: "#121417", textWrap: "balance" }}
                >
                  Positivity Artisans Group
                </h3>
                <p className="mt-5 text-sm leading-7 text-[#68707A]">
                  A private executive coaching group for clients who want a
                  deeper container, monthly group meetings, retreat access, and
                  private coaching with Dr. Paul.
                </p>
                <ul className="mt-6 grid gap-3 text-sm text-[#4F5760]">
                  {[
                    "Private executive coaching group",
                    "Monthly group meetings",
                    "Annual retreats",
                    "Private sessions with Dr. Paul",
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="text-[#F59E0B]">
                        <CheckIcon />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className="mt-auto inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(18,20,23,0.14)] px-5 py-3 text-sm font-semibold transition hover:border-[rgba(245,158,11,0.48)]"
                  style={{ color: "#121417" }}
                >
                  Apply here
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section id="team" className="w-full bg-[#FAFAF8] px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 grid gap-6 lg:grid-cols-[0.75fr_1fr] lg:items-end">
              <div>
                <p
                  className="mb-3 text-xs font-semibold uppercase"
                  style={{ color: "#4E8C78", letterSpacing: "0.13em" }}
                >
                  Meet your team
                </p>
                <h2
                  className="font-heading font-bold"
                  style={{
                    color: "#121417",
                    fontSize: "clamp(2rem, 4vw, 3.45rem)",
                    lineHeight: "1.04",
                    letterSpacing: "-0.045em",
                    textWrap: "balance",
                  }}
                >
                  Coaching that feels personal, steady, and practical.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-[#68707A] lg:justify-self-end">
                Each coaching relationship starts with where the client is now.
                The work is supportive and direct, with an emphasis on small
                changes that can be practiced between sessions.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {coaches.map((coach) => (
                <article
                  key={coach.name}
                  className="rounded-2xl border border-[rgba(221,215,207,0.85)] bg-white p-5 shadow-[0_10px_30px_rgba(18,20,23,0.045)]"
                >
                  <div className="relative mb-5 h-56 overflow-hidden rounded-xl bg-[#F6F3EE]">
                    {coach.image ? (
                      <Image
                        src={coach.image}
                        alt={coach.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover object-[50%_18%]"
                      />
                    ) : (
                      <div
                        className="flex h-full items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(145deg, rgba(46,196,182,0.16), rgba(68,168,216,0.12))",
                        }}
                      >
                        <span className="font-heading text-5xl font-bold text-[#2B6861]">
                          {coach.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3
                    className="font-heading text-xl font-bold"
                    style={{ color: "#121417", textWrap: "balance" }}
                  >
                    {coach.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#8E959E]">
                    {coach.title}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[#68707A]">
                    {coach.bio}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full bg-[#121417] px-5 py-14 sm:px-8 sm:py-18">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.13em] text-white/44">
                Ready when they are
              </p>
              <h2
                className="font-heading font-bold text-white"
                style={{
                  color: "#FFFFFF",
                  fontSize: "clamp(2rem, 4vw, 3.5rem)",
                  lineHeight: "1.05",
                  letterSpacing: "-0.045em",
                  textWrap: "balance",
                }}
              >
                Send clients to one simple coaching page.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58">
                Choose a coaching pass when you want more direct support. We will add it
                to your Positives account and guide you back to your coaching dashboard.
              </p>
            </div>
            <CoachingCheckoutButton packType="punch_pass" className="lg:justify-self-end">
              Start your coaching pass
            </CoachingCheckoutButton>
          </div>
        </section>
      </main>

      <PublicSiteFooter
        paidHref={publicSession.paidHref}
        session={publicSession}
      />
    </div>
  );
}
