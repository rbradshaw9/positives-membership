import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";
import { LaunchWaitlistForm } from "./launch-waitlist-form";

export const metadata: Metadata = {
  title: "Positives — Join the Launch Waitlist",
  description:
    "Join the Positives launch waitlist for a simple daily practice with Dr. Paul Jenkins: short guided audio, a weekly principle, and a monthly theme.",
  alternates: {
    canonical: "/",
  },
};

const practiceRhythm = [
  {
    label: "Daily",
    title: "A short guided reset",
    description:
      "A few minutes of audio to help you pause, reframe, and choose your next step.",
  },
  {
    label: "Weekly",
    title: "One principle to practice",
    description:
      "A focused idea for the week, with reflection prompts that keep it practical.",
  },
  {
    label: "Monthly",
    title: "A theme to return to",
    description:
      "A broader pattern for growth, repeated gently so members never feel behind.",
  },
];

const launchSteps = [
  "Join the waitlist.",
  "Get simple launch updates.",
  "Be first to know when Positives opens.",
];

export default function LandingPage() {
  const session = ANONYMOUS_PUBLIC_SESSION_STATE;

  return (
    <div className="min-h-dvh overflow-x-hidden" style={{ background: "#FAFAF8" }}>
      <PublicSiteHeader
        signInHref={session.signInHref}
        signInLabel={session.signInLabel}
        primaryCtaHref="#launch-waitlist"
        primaryCtaLabel="Join waitlist"
        navLinks={[
          { href: "#how-it-works", label: "Practice", hiddenOnMobile: true },
          { href: "#dr-paul", label: "Dr. Paul", hiddenOnMobile: true },
          { href: "/learn", label: "Learn more", hiddenOnMobile: true },
        ]}
      />

      <main>
        <section className="relative overflow-hidden border-b border-[#DDD7CF]/70">
          <div
            className="mx-auto grid min-h-[calc(100dvh-57px)] max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.03fr_0.97fr] lg:py-20"
          >
            <div className="max-w-3xl">
              <p
                className="mb-5 text-xs font-bold uppercase"
                style={{ color: "#2EC4B6", letterSpacing: "0.16em" }}
              >
                Launching soon
              </p>
              <h1
                className="font-heading text-5xl font-bold sm:text-6xl lg:text-7xl"
                style={{
                  color: "#121417",
                  lineHeight: "1.02",
                  textWrap: "balance",
                }}
              >
                Build a more positive life, a few minutes at a time.
              </h1>
              <p
                className="mt-6 max-w-2xl text-lg leading-8 sm:text-xl sm:leading-9"
                style={{ color: "#4F5760" }}
              >
                Positives is a daily practice from Dr. Paul Jenkins: short
                guided audio, a weekly principle, and a monthly theme for real
                life. No catching up. No pressure.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {["Daily audio", "Weekly principle", "Monthly theme"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border px-4 py-2 text-sm font-semibold"
                    style={{
                      background: "#FFFFFF",
                      borderColor: "#DDD7CF",
                      color: "#3F4852",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <aside
              id="launch-waitlist"
              className="rounded-[8px] border p-5 shadow-sm sm:p-6"
              style={{
                background: "#FFFFFF",
                borderColor: "#DDD7CF",
                boxShadow: "0 22px 60px rgba(18,20,23,0.08)",
              }}
              aria-label="Join the Positives launch waitlist"
            >
              <div className="mb-6">
                <p
                  className="font-heading text-2xl font-bold"
                  style={{ color: "#121417", textWrap: "balance" }}
                >
                  Know when Positives opens.
                </p>
                <p className="mt-3 text-sm leading-7" style={{ color: "#68707A" }}>
                  We will send launch updates, early details, and a clear next
                  step when membership opens.
                </p>
              </div>
              <LaunchWaitlistForm />
              <p className="mt-5 text-center text-sm" style={{ color: "#68707A" }}>
                Already a member?{" "}
                <Link href={session.signInHref} className="font-semibold" style={{ color: "#2F6FED" }}>
                  Sign in
                </Link>
              </p>
            </aside>
          </div>
        </section>

        <section id="how-it-works" className="border-b border-[#DDD7CF]/70">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="max-w-3xl">
              <p
                className="mb-4 text-xs font-bold uppercase"
                style={{ color: "#68707A", letterSpacing: "0.14em" }}
              >
                The rhythm
              </p>
              <h2
                className="font-heading text-4xl font-bold sm:text-5xl"
                style={{ color: "#121417", lineHeight: "1.08", textWrap: "balance" }}
              >
                A practice, not another course to finish.
              </h2>
              <p className="mt-5 text-lg leading-8" style={{ color: "#4F5760" }}>
                Positives is built around return and repetition. Members get a
                next step for today, context for the week, and a theme for the
                month.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {practiceRhythm.map((item) => (
                <article
                  key={item.label}
                  className="rounded-[8px] border p-5"
                  style={{ background: "#FFFFFF", borderColor: "#DDD7CF" }}
                >
                  <p
                    className="mb-4 text-xs font-bold uppercase"
                    style={{ color: "#2F6FED", letterSpacing: "0.14em" }}
                  >
                    {item.label}
                  </p>
                  <h3
                    className="font-heading text-2xl font-bold"
                    style={{ color: "#121417", lineHeight: "1.15", textWrap: "balance" }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7" style={{ color: "#68707A" }}>
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="dr-paul" className="border-b border-[#DDD7CF]/70">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[8px] border border-[#DDD7CF] bg-white">
              <Image
                src="/Dr._Paul_Jenkins.jpg"
                alt="Dr. Paul Jenkins"
                fill
                sizes="(min-width: 1024px) 360px, 100vw"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <p
                className="mb-4 text-xs font-bold uppercase"
                style={{ color: "#2EC4B6", letterSpacing: "0.14em" }}
              >
                Guided by Dr. Paul Jenkins
              </p>
              <h2
                className="font-heading text-4xl font-bold sm:text-5xl"
                style={{ color: "#121417", lineHeight: "1.08", textWrap: "balance" }}
              >
                Practical psychology for ordinary, complicated days.
              </h2>
              <p className="mt-5 text-lg leading-8" style={{ color: "#4F5760" }}>
                Positives brings Dr. Paul&apos;s simple, steady teaching style
                into a daily rhythm members can actually use: listen, reflect,
                and return tomorrow.
              </p>
              <Link
                href="/learn"
                className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold"
                style={{
                  background: "#FFFFFF",
                  borderColor: "#DDD7CF",
                  color: "#121417",
                }}
              >
                See how Positives works
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p
                  className="mb-4 text-xs font-bold uppercase"
                  style={{ color: "#68707A", letterSpacing: "0.14em" }}
                >
                  After you join
                </p>
                <h2
                  className="font-heading text-4xl font-bold sm:text-5xl"
                  style={{ color: "#121417", lineHeight: "1.08", textWrap: "balance" }}
                >
                  We will keep the launch updates simple.
                </h2>
              </div>
              <div className="space-y-3">
                {launchSteps.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-4 rounded-[8px] border p-4"
                    style={{ background: "#FFFFFF", borderColor: "#DDD7CF" }}
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      style={{ background: "#EAF1FF", color: "#2F6FED" }}
                    >
                      {index + 1}
                    </span>
                    <p className="font-semibold" style={{ color: "#3F4852" }}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter paidHref="#launch-waitlist" session={session} />
    </div>
  );
}
