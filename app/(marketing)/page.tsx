import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";
import { LaunchWaitlistForm } from "./launch-waitlist-form";

export const metadata: Metadata = {
  title: "Positives — Get Beta Access",
  description:
    "Join the Positives beta launch list for a simple daily mindset practice with Dr. Paul Jenkins: short guided audio, weekly practices, and monthly themes.",
  alternates: {
    canonical: "/",
  },
};

const practiceRhythm = [
  {
    label: "Daily",
    title: "A short guided reset",
    description:
      "A few minutes of audio to help you pause, reframe your thoughts, and choose your next step with more intention.",
  },
  {
    label: "Weekly",
    title: "One idea to practice",
    description:
      "A practical principle for the week, with simple reflection prompts that help you apply it to real situations.",
  },
  {
    label: "Monthly",
    title: "A theme to grow with",
    description:
      "Each month focuses on one meaningful theme, giving you time to practice it in your everyday life without feeling rushed or behind.",
  },
];

const launchSteps = [
  {
    title: "Join the Beta Launch List.",
    description: "Add your name and email so we can keep you updated.",
  },
  {
    title: "Get beta launch updates.",
    description:
      "We will send early details about Positives, what is included, and how the beta will work.",
  },
  {
    title: "Get first access when the beta opens.",
    description:
      "When we are ready, you will be among the first invited to join Positives during the beta launch.",
  },
];

export default function LandingPage() {
  const session = ANONYMOUS_PUBLIC_SESSION_STATE;
  const footerSession = {
    ...session,
    paidShortLabel: "Get Beta Access",
  };

  return (
    <div className="min-h-dvh overflow-x-hidden" style={{ background: "#FAFAF8" }}>
      <PublicSiteHeader
        signInHref={session.signInHref}
        signInLabel={session.signInLabel}
        primaryCtaHref="#launch-waitlist"
        primaryCtaLabel="Get Beta Access"
        navLinks={[
          { href: "#practice", label: "Practice", hiddenOnMobile: true },
          { href: "#dr-paul", label: "Dr. Paul", hiddenOnMobile: true },
          { href: "#how-it-works", label: "How it works", hiddenOnMobile: true },
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
                Beta launching soon
              </p>
              <h1
                className="font-heading text-5xl font-bold sm:text-6xl lg:text-7xl"
                style={{
                  color: "#121417",
                  lineHeight: "1.02",
                  textWrap: "balance",
                }}
              >
                Help shape Positives before it opens to everyone.
              </h1>
              <p
                className="mt-6 max-w-2xl text-lg leading-8 sm:text-xl sm:leading-9"
                style={{ color: "#4F5760" }}
              >
                Positives is a simple daily mindset practice from Dr. Paul
                Jenkins. During the beta launch, members will get early access
                to short guided audio, weekly practices, and monthly themes
                designed to help you feel more steady, clear, and positive in
                everyday life.
              </p>
              <p
                className="mt-4 max-w-2xl text-base leading-8 sm:text-lg"
                style={{ color: "#4F5760" }}
              >
                This is not another course you have to finish. It is a small
                daily practice you can return to whenever you need a reset.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {["Daily audio", "Weekly practice", "Monthly theme"].map((item) => (
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
              aria-label="Join the Positives beta launch list"
            >
              <div className="mb-6">
                <p
                  className="font-heading text-2xl font-bold"
                  style={{ color: "#121417", textWrap: "balance" }}
                >
                  Get on the Beta Launch List
                </p>
                <p className="mt-3 text-sm leading-7" style={{ color: "#68707A" }}>
                  We are getting ready to open Positives to a small group of
                  early members.
                </p>
                <p className="mt-3 text-sm leading-7" style={{ color: "#68707A" }}>
                  Join the Beta Launch List and we will let you know when early
                  access becomes available. You will get launch updates, beta
                  details, and the first opportunity to join before Positives
                  opens more widely.
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

        <section id="practice" className="border-b border-[#DDD7CF]/70">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="max-w-3xl">
              <p
                className="mb-4 text-xs font-bold uppercase"
                style={{ color: "#68707A", letterSpacing: "0.14em" }}
              >
                How Positives works
              </p>
              <h2
                id="how-it-works"
                className="font-heading text-4xl font-bold sm:text-5xl"
                style={{ color: "#121417", lineHeight: "1.08", textWrap: "balance" }}
              >
                A daily practice you can actually keep doing.
              </h2>
              <p className="mt-5 text-lg leading-8" style={{ color: "#4F5760" }}>
                Positives is built around small, steady repetition. Each day
                gives you a simple reset. Each week gives you one principle to
                practice. Each month gives you a bigger theme to return to.
              </p>
              <p className="mt-4 text-lg leading-8" style={{ color: "#4F5760" }}>
                You do not have to catch up. You do not have to complete
                everything perfectly. Just listen, reflect, practice, and come
                back tomorrow.
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
                Practical psychology for real life.
              </h2>
              <p className="mt-5 text-lg leading-8" style={{ color: "#4F5760" }}>
                Dr. Paul Jenkins has spent years helping people understand
                their thoughts, emotions, relationships, and choices in a
                simple, practical way.
              </p>
              <p className="mt-4 text-lg leading-8" style={{ color: "#4F5760" }}>
                Positives brings his steady teaching style into a daily rhythm
                you can actually use: listen, reflect, practice, and return
                tomorrow.
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
                  Beta access launching soon
                </p>
                <h2
                  className="font-heading text-4xl font-bold sm:text-5xl"
                  style={{ color: "#121417", lineHeight: "1.08", textWrap: "balance" }}
                >
                  What happens after you join the Beta Launch List?
                </h2>
                <p className="mt-5 text-lg leading-8" style={{ color: "#4F5760" }}>
                  We will keep it simple.
                </p>
              </div>
              <div className="space-y-3">
                {launchSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex items-center gap-4 rounded-[8px] border p-4"
                    style={{ background: "#FFFFFF", borderColor: "#DDD7CF" }}
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      style={{ background: "#EAF1FF", color: "#2F6FED" }}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold" style={{ color: "#3F4852" }}>
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm leading-6" style={{ color: "#68707A" }}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter paidHref="#launch-waitlist" session={footerSession} />
    </div>
  );
}
