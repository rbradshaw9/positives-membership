import Image from "next/image";
import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { PublicTrackedLink } from "@/components/marketing/PublicTrackedLink";
import { getPublicSessionState } from "@/lib/marketing/public-session";

export const metadata: Metadata = {
  title: "About Dr. Paul Jenkins — Positives",
  description:
    "Dr. Paul Jenkins is a licensed Clinical Psychologist with 30+ years of experience helping people build stronger mindsets, healthier relationships, and more intentional lives. Learn about the creator of Positives.",
  alternates: {
    canonical: "/about",
  },
};

export default async function AboutPage() {
  const session = await getPublicSessionState();

  return (
    <div className="min-h-dvh" style={{ background: "#FAFAF8" }}>
      <PublicSiteHeader
        signInHref={session.signInHref}
        signInLabel={session.signInLabel}
        navLinks={[
          { href: "/", label: "Home" },
          { href: "/faq", label: "FAQ", hiddenOnMobile: true },
          { href: "/support", label: "Support", hiddenOnMobile: true },
        ]}
        primaryCtaHref={session.paidHref}
        primaryCtaLabel={session.paidShortLabel}
      />

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <section
        className="relative w-full overflow-hidden"
        style={{ background: "#FAFAF8" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(78,140,120,0.07) 0%, transparent 60%)" }}
        />
        <div
          className="relative max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
          style={{ paddingTop: "clamp(4rem, 8vw, 7rem)", paddingBottom: "clamp(4rem, 8vw, 7rem)" }}
        >
          <div>
            <p
              className="text-xs font-semibold uppercase mb-6"
              style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
            >
              Your guide
            </p>
            <h1
              className="font-heading font-bold mb-6"
              style={{
                fontSize: "clamp(2.2rem, 4.5vw, 3.75rem)",
                letterSpacing: "-0.045em",
                lineHeight: "1.06",
                color: "#121417",
              }}
            >
              Dr. Paul Jenkins
            </h1>
            <p
              style={{
                fontSize: "clamp(1rem, 1.5vw, 1.15rem)",
                color: "#68707A",
                lineHeight: "1.78",
                marginBottom: "1.5rem",
              }}
            >
              Dr. Paul Jenkins is a licensed Clinical Psychologist, bestselling
              author, and sought-after keynote speaker with over 30 years of
              experience helping people build stronger thinking, healthier
              relationships, and more intentional lives.
            </p>
            <p style={{ fontSize: "1rem", color: "#68707A", lineHeight: "1.78", marginBottom: "2rem" }}>
              Through his work with families, leaders, organizations, and
              communities, Dr. Paul has helped tens of thousands of people
              develop the mindset skills that make life calmer, clearer, and
              more meaningful.
            </p>

            {/* Credential badges */}
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                "Clinical Psychologist",
                "Bestselling Author",
                "Keynote Speaker",
                "30+ Years Research",
                "Live on Purpose Podcast",
              ].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center text-xs font-medium rounded-full px-3 py-1.5"
                  style={{
                    background: "rgba(78,140,120,0.09)",
                    color: "#4E8C78",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            <PublicTrackedLink
              href="/join"
              className="inline-flex items-center justify-center font-semibold rounded-full"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 4px 16px rgba(47,111,237,0.28)",
                letterSpacing: "-0.01em",
                fontSize: "1rem",
                padding: "0.875rem 2rem",
              }}
            >
              Join the practice →
            </PublicTrackedLink>
          </div>

          {/* Photo */}
          <div className="flex justify-center lg:justify-end">
            <div
              className="relative overflow-hidden rounded-3xl"
              style={{
                width: "100%",
                maxWidth: "420px",
                aspectRatio: "3/4",
                boxShadow: "0 32px 80px rgba(18,20,23,0.14)",
              }}
            >
              <Image
                src="/Dr._Paul_Jenkins.jpg"
                alt="Dr. Paul Jenkins — Clinical Psychologist and creator of Positives"
                fill
                sizes="(max-width: 1024px) 80vw, 420px"
                className="object-cover object-top"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Background & Mission ────────────────────────────────────────── */}
      <section
        className="w-full"
        style={{ background: "#121417", borderTop: "1px solid #1C2028" }}
      >
        <div
          className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-3 gap-12"
          style={{ paddingTop: "clamp(4rem, 8vw, 7rem)", paddingBottom: "clamp(4rem, 8vw, 7rem)" }}
        >
          <div className="lg:col-span-1">
            <p
              className="text-xs font-semibold uppercase mb-4"
              style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
            >
              The work
            </p>
            <h2
              className="font-heading font-bold"
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.1",
                color: "#FFFFFF",
              }}
            >
              30 years of helping people think better.
            </h2>
          </div>

          <div
            className="lg:col-span-2 space-y-6"
            style={{ fontSize: "1.05rem", color: "#8A9199", lineHeight: "1.78" }}
          >
            <p>
              Dr. Paul&apos;s work began in clinical practice — working directly
              with families, couples, and individuals who were struggling to find
              hope, clarity, and peace in their daily lives. What he discovered
              was consistent: the single biggest predictor of someone&apos;s
              emotional wellbeing wasn&apos;t their circumstances. It was how
              they were thinking about them.
            </p>
            <p>
              That insight became the foundation of everything Dr. Paul
              teaches. He went on to author multiple books on positivity and
              personal growth, launch the Live on Purpose Radio podcast (with
              millions of downloads), speak at events for Fortune 500 companies,
              schools, and organizations worldwide, and train thousands of
              coaches and leaders.
            </p>
            <p style={{ color: "#CBD2D9" }}>
              Positives is the distillation of three decades of that work —
              delivered in a few focused minutes each day. It&apos;s not a
              course. It&apos;s a daily practice, designed to build something
              that lasts.
            </p>
          </div>
        </div>
      </section>

      {/* ─── By the Numbers ─────────────────────────────────────────────── */}
      <section className="w-full" style={{ background: "#F6F3EE", borderTop: "1px solid #DDD7CF" }}>
        <div
          className="max-w-6xl mx-auto px-8"
          style={{ paddingTop: "clamp(4rem, 7vw, 6rem)", paddingBottom: "clamp(4rem, 7vw, 6rem)" }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { stat: "30+", label: "Years in clinical practice" },
              { stat: "10M+", label: "Podcast downloads" },
              { stat: "6", label: "Published books" },
              { stat: "1000s", label: "Lives changed" },
            ].map(({ stat, label }) => (
              <div key={label} className="text-center">
                <p
                  className="font-heading font-bold mb-2"
                  style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#121417", letterSpacing: "-0.04em" }}
                >
                  {stat}
                </p>
                <p className="text-sm" style={{ color: "#68707A", lineHeight: "1.5" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What He Teaches ────────────────────────────────────────────── */}
      <section className="w-full" style={{ background: "#FAFAF8", borderTop: "1px solid rgba(221,215,207,0.55)" }}>
        <div
          className="max-w-6xl mx-auto px-8"
          style={{ paddingTop: "clamp(4rem, 8vw, 7rem)", paddingBottom: "clamp(4rem, 8vw, 7rem)" }}
        >
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase mb-4" style={{ color: "#4E8C78", letterSpacing: "0.14em" }}>
              Core principles
            </p>
            <h2
              className="font-heading font-bold mx-auto"
              style={{
                fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.1",
                color: "#121417",
                maxWidth: "540px",
              }}
            >
              What Dr. Paul teaches, and why it works.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "You choose your thoughts",
                body: "The foundational idea: your mindset is not something that happens to you. It is something you actively build or neglect. Positivity is a skill, and like any skill, it improves with practice.",
              },
              {
                title: "Small and consistent beats big and occasional",
                body: "A few focused minutes each day creates far more lasting change than a weekend retreat every few months. The Positives practice is built on this principle.",
              },
              {
                title: "Respond instead of react",
                body: "Most stress, conflict, and regret comes from reactive thinking. Dr. Paul&apos;s work centers on building the gap between stimulus and response — where wisdom and intentionality live.",
              },
            ].map(({ title, body }) => (
              <div
                key={title}
                className="rounded-2xl p-8"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(221,215,207,0.7)",
                  boxShadow: "0 4px 16px rgba(18,20,23,0.04)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-5"
                  style={{ background: "rgba(78,140,120,0.1)" }}
                  aria-hidden="true"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3
                  className="font-heading font-semibold mb-3"
                  style={{ fontSize: "1.1rem", color: "#121417", letterSpacing: "-0.02em" }}
                >
                  {title}
                </h3>
                <p style={{ fontSize: "0.95rem", color: "#68707A", lineHeight: "1.72" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social / Resources ─────────────────────────────────────────── */}
      <section className="w-full" style={{ background: "#121417", borderTop: "1px solid #1C2028" }}>
        <div
          className="max-w-6xl mx-auto px-8 text-center"
          style={{ paddingTop: "clamp(4rem, 7vw, 6rem)", paddingBottom: "clamp(4rem, 7vw, 6rem)" }}
        >
          <p className="text-xs font-semibold uppercase mb-6" style={{ color: "#4E8C78", letterSpacing: "0.14em" }}>
            Find Dr. Paul
          </p>
          <h2
            className="font-heading font-bold mb-10"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.04em",
              lineHeight: "1.1",
              color: "#FFFFFF",
            }}
          >
            More from Dr. Paul
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
            {[
              {
                label: "Live on Purpose Radio",
                desc: "The podcast — millions of listens",
                href: "https://drpauljenkins.com/live-on-purpose-radio/",
              },
              {
                label: "Live on Purpose TV",
                desc: "YouTube channel — free video library",
                href: "https://www.youtube.com/user/LiveOnPurposeTV",
              },
              {
                label: "drpauljenkins.com",
                desc: "Speaking, books, and more",
                href: "https://drpauljenkins.com",
              },
            ].map(({ label, desc, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl p-6 transition-all hover:transform hover:-translate-y-0.5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="font-semibold mb-1" style={{ color: "#CBD2D9", fontSize: "0.95rem" }}>
                  {label}
                </p>
                <p style={{ color: "#4A5360", fontSize: "0.85rem" }}>{desc}</p>
              </a>
            ))}
          </div>

          <PublicTrackedLink
            href="/join"
            className="inline-flex items-center justify-center font-semibold rounded-full"
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              color: "#FFFFFF",
              boxShadow: "0 8px 32px rgba(47,111,237,0.35)",
              letterSpacing: "-0.01em",
              fontSize: "1rem",
              padding: "1rem 2.5rem",
            }}
          >
            Start the practice →
          </PublicTrackedLink>
          <p className="mt-4 text-sm" style={{ color: "#4A5360" }}>
            From $37/month · Cancel anytime · 30-day guarantee
          </p>
        </div>
      </section>

      <PublicSiteFooter paidHref={session.paidHref} session={session} />
    </div>
  );
}
