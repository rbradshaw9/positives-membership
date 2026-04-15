import Link from "next/link";
import Image from "next/image";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { StickyCtaBar } from "@/components/marketing/StickyCtaBar";
import { LandingAudioPlayer } from "@/components/marketing/LandingAudioPlayer";
import { LandingFaq } from "@/components/marketing/LandingFaq";
import {
  appendPublicTrackingParams,
  type PublicSearchParams,
} from "@/lib/marketing/public-query-params";
import type { PublicSessionState } from "@/lib/marketing/public-session";

/* ─── Check Icon ─────────────────────────────────────────────────────────── */

function CheckIcon({ color = "#4E8C78" }: { color?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: "3px" }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ─── Main Landing Page Shell ───────────────────────────────────────────── */

type LandingPageClientProps = {
  session: PublicSessionState;
  signInHref: string;
  paidHref: string;
  trackingParams?: PublicSearchParams;
};

function LandingPageShell({
  session,
  signInHref,
  paidHref,
  trackingParams,
}: LandingPageClientProps) {
  const trackedPaidHref = appendPublicTrackingParams(paidHref, trackingParams);
  const trackedSupportHref = appendPublicTrackingParams("/support", trackingParams);

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden" style={{ background: "#FAFAF8" }}>

      {/* ━━ 1. NAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <PublicSiteHeader
        signInHref={signInHref}
        signInLabel={session.signInLabel}
        primaryCtaHref={paidHref}
        primaryCtaLabel={session.paidShortLabel}
        trackingParams={trackingParams}
        navLinks={[
          { href: "#how-it-works", label: "How it Works", hiddenOnMobile: true },
          { href: "#dr-paul", label: "Dr. Paul", hiddenOnMobile: true },
        ]}
      />

      {/* ━━ 2. HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full flex flex-col items-center justify-center text-center px-6 overflow-hidden"
        style={{ minHeight: "calc(100dvh - 57px)", background: "#FAFAF8" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(47,111,237,0.07) 0%, transparent 60%)" }}
        />

        <div className="relative flex flex-col items-center max-w-4xl mx-auto" style={{ paddingTop: "clamp(2.5rem, 7vw, 3rem)", paddingBottom: "clamp(3.25rem, 9vw, 4.25rem)" }}>
          {/* Eyebrow — credential tag removed per launch polish; subtext carries the framing */}

          {/* Headline */}
          <h1
            className="font-heading font-bold mb-8"
            style={{
              fontSize: "clamp(3rem, 7.5vw, 7rem)",
              lineHeight: "1.02",
              letterSpacing: "-0.05em",
              color: "#121417",
            }}
          >
            <span className="block sm:whitespace-nowrap">A few minutes each day.</span>
            <span
              className="block sm:whitespace-nowrap"
              style={{
                background: "linear-gradient(135deg, #2F6FED 20%, #4E8C78 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              A more positive life.
            </span>
          </h1>

          {/* Sub */}
          <p
            className="mb-5 mx-auto"
            style={{
              fontSize: "clamp(1.05rem, 1.8vw, 1.2rem)",
              color: "#68707A",
              lineHeight: "1.72",
              maxWidth: "640px",
              letterSpacing: "-0.01em",
            }}
          >
            Positives is a guided daily practice designed to help you think
            more clearly, respond more calmly, and build a life you actually
            enjoy living.
          </p>

          {/* Specificity anchor */}
          <p
            className="mb-10 mx-auto"
            style={{
              fontSize: "0.9rem",
              color: "#9AA0A8",
              letterSpacing: "-0.01em",
            }}
          >
            5–15 minutes daily · No prior experience needed · Works on any device
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 w-full sm:w-auto">
            <Link
              href={trackedPaidHref}
              className="inline-flex w-full sm:w-auto items-center justify-center font-semibold rounded-full"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 8px 28px rgba(47,111,237,0.30)",
                letterSpacing: "-0.01em",
                fontSize: "0.95rem",
                padding: "1rem 2.25rem",
              }}
            >
              {session.paidActionLabel}
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium" style={{ color: "#68707A" }}>
              See how it works
            </Link>
          </div>

          {/* Micro pricing anchor */}
          <p className="text-sm" style={{ color: "#B0A89E" }}>
            From <span style={{ color: "#68707A" }}>$37/month</span> · Cancel anytime · 30-day guarantee
          </p>
        </div>
      </section>

      {/* Sentinel — marks bottom of hero for sticky mobile CTA */}
      <div id="landing-hero-sentinel" aria-hidden="true" />

      <StickyCtaBar
        sentinelId="landing-hero-sentinel"
        href={trackedPaidHref}
        label={session.hasMemberAccess ? "Open today’s practice →" : "Start your daily practice →"}
      />

      {/* ━━ 3. PROBLEM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="w-full" style={{ background: "#121417", borderTop: "1px solid #1C2028" }}>
        <div
          className="max-w-6xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
          style={{ paddingTop: "clamp(5rem, 9vw, 8rem)", paddingBottom: "clamp(5rem, 9vw, 8rem)" }}
        >
          <div>
            <h2
              className="font-heading font-bold"
              style={{ fontSize: "clamp(2.2rem, 5vw, 4.5rem)", lineHeight: "1.04", letterSpacing: "-0.045em", color: "#FFFFFF" }}
            >
              Life moves fast.
              <br />
              <span style={{ color: "#3A4148" }}>Your mind moves faster.</span>
            </h2>
          </div>

          <div className="space-y-5" style={{ fontSize: "1.05rem", color: "#8A9199", lineHeight: "1.78" }}>
            <p>Most people spend their days reacting.</p>
            <div className="space-y-2 pl-5" style={{ borderLeft: "2px solid rgba(255,255,255,0.06)" }}>
              <p>To stress.</p>
              <p>To news.</p>
              <p>To expectations.</p>
              <p>To other people&apos;s emotions.</p>
            </div>
            <p>It&apos;s exhausting.</p>
            <p className="font-medium" style={{ color: "#CBD2D9" }}>
              Positives is a daily mental reset — a structured practice that
              helps you slow down, see clearly, and respond with intention.
            </p>
            <p>Just a few minutes each day can change how you experience the rest of it.</p>
          </div>
        </div>
      </section>

      {/* ━━ 4. THE PRACTICE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="how-it-works" className="w-full" style={{ background: "#F6F3EE", borderTop: "1px solid #DDD7CF" }}>
        <div
          className="max-w-6xl mx-auto px-5 sm:px-8"
          style={{ paddingTop: "clamp(5rem, 9vw, 8rem)", paddingBottom: "clamp(5rem, 9vw, 8rem)" }}
        >
          <div className="max-w-2xl mb-16">
            <p className="text-xs font-semibold uppercase mb-5" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
              The practice
            </p>
            <div className="flex items-start gap-4 mb-5">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center mt-1"
                style={{ background: "linear-gradient(135deg, rgba(47,111,237,0.10) 0%, rgba(78,140,120,0.10) 100%)", border: "1px solid rgba(78,140,120,0.18)" }}
                aria-hidden="true"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l3 3" />
                </svg>
              </div>
              <h2
                className="font-heading font-bold"
                style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)", letterSpacing: "-0.045em", lineHeight: "1.06", color: "#121417" }}
              >
                A simple practice that builds real change.
              </h2>
            </div>
            <p style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.72" }}>
              Positives isn&apos;t about motivation. It&apos;s about building a mindset practice that works — every single day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-14">
            {[
              {
                freq: "Daily",
                accent: "#2F6FED",
                title: "Daily Practice",
                desc: "A short guided audio session designed to reset your thinking, refocus your day, and keep you moving through the system. Just a few minutes is enough to shift your perspective and move forward with clarity.",
              },
              {
                freq: "Weekly",
                accent: "#4E8C78",
                title: "Weekly Reflection",
                desc: "Each week, a focused reflection or practice reinforces the monthly theme and deepens your understanding of the mindset principles Dr. Paul teaches. These ideas compound over time.",
              },
              {
                freq: "Monthly",
                accent: "#D98A4E",
                title: "Monthly Theme",
                desc: "Each month centers on one guiding theme from Dr. Paul. It gives the daily practice and weekly reflections a shared focus so the work feels grounded, calm, and connected.",
              },
            ].map(({ freq, accent, title, desc }) => (
              <div key={freq}>
                <div className="mb-5">
                  <span
                    className="inline-block text-xs font-bold uppercase px-3 py-1 rounded-full"
                    style={{ color: accent, background: `${accent}18`, letterSpacing: "0.10em" }}
                  >
                    {freq}
                  </span>
                </div>
                <h3
                  className="font-heading font-semibold mb-4"
                  style={{ fontSize: "1.2rem", letterSpacing: "-0.025em", lineHeight: "1.3", color: "#121417" }}
                >
                  {title}
                </h3>
                <p style={{ fontSize: "0.975rem", color: "#68707A", lineHeight: "1.78" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ 5. SAMPLE AUDIO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full text-center relative overflow-hidden"
        style={{ background: "#F6F3EE", borderTop: "1px solid #DDD7CF" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(78,140,120,0.07) 0%, transparent 65%)" }}
        />
        <div
          className="max-w-6xl mx-auto px-5 sm:px-8"
          style={{ paddingTop: "clamp(4rem, 7vw, 6.5rem)", paddingBottom: "clamp(4rem, 7vw, 6.5rem)" }}
        >
          <p className="text-xs font-semibold uppercase mb-5" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
            Sample
          </p>
          <h2
            className="font-heading font-bold mb-4"
            style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", letterSpacing: "-0.045em", lineHeight: "1.07", color: "#121417" }}
          >
            Hear Dr. Paul&apos;s practice
          </h2>
          <p
            className="mb-10 mx-auto"
            style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.72", maxWidth: "440px" }}
          >
            Experience a sample session and hear how a few minutes of guided
            thinking can shift your entire day.
          </p>

          <LandingAudioPlayer />

          <p className="mt-8 text-sm" style={{ color: "#B0A89E" }}>
            Daily sessions available to members ·{" "}
            <Link href={trackedPaidHref} className="font-medium underline underline-offset-2" style={{ color: "#2F6FED" }}>
              {session.hasMemberAccess ? "Open your practice" : "Start your practice"}
            </Link>
          </p>
        </div>
      </section>

      {/* ━━ 6. THE SYSTEM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="w-full" style={{ background: "#121417", borderTop: "1px solid #1C2028" }}>
        <div
          className="max-w-6xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
          style={{ paddingTop: "clamp(5rem, 9vw, 8rem)", paddingBottom: "clamp(5rem, 9vw, 8rem)" }}
        >
          <div>
            <p className="text-xs font-semibold uppercase mb-6" style={{ color: "#4E8C78", letterSpacing: "0.14em" }}>
              The system
            </p>
            <h2
              className="font-heading font-bold mb-7"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)", letterSpacing: "-0.045em", lineHeight: "1.06", color: "#FFFFFF" }}
            >
              A complete system for living more positively.
            </h2>
            <div className="space-y-4 mb-8" style={{ fontSize: "1.05rem", color: "#8A9199", lineHeight: "1.78" }}>
              <p>Positives begins with a daily mindset practice.</p>
              <p>But it grows into something much deeper.</p>
              <p>
                Members build new habits of thinking, connect with others on the
                same path, and explore ideas that lead to stronger
                relationships, clearer purpose, and a more intentional life.
              </p>
            </div>
            <Link
              href={trackedPaidHref}
              className="inline-flex items-center justify-center font-semibold rounded-full"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 8px 28px rgba(47,111,237,0.25)",
                letterSpacing: "-0.01em",
                fontSize: "0.95rem",
                padding: "0.9rem 2rem",
              }}
            >
              {session.paidActionLabel}
            </Link>
          </div>

          <div>
            <div className="space-y-1 mb-8">
              {[
                "Daily guided audio practices",
                "Weekly reflections & mindset principles",
                "Monthly themes with Dr. Paul",
                "Full member library",
                "Live member events with Membership + Events",
                "Weekly coaching inside Coaching Circle",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-4 py-4"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(78,140,120,0.15)" }}
                    aria-hidden="true"
                  >
                    <CheckIcon color="#4E8C78" />
                  </span>
                  <span className="font-medium" style={{ fontSize: "1rem", color: "#CBD2D9", letterSpacing: "-0.01em" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm" style={{ color: "#4A5360" }}>Start with the core practice and grow into the rest.</p>
          </div>
        </div>
      </section>

      {/* ━━ 7. DR. PAUL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="dr-paul" className="w-full" style={{ background: "#F6F3EE", borderTop: "1px solid #DDD7CF" }}>
        <div
          className="max-w-6xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-12 lg:gap-20 items-center"
          style={{ paddingTop: "clamp(5rem, 9vw, 8rem)", paddingBottom: "clamp(5rem, 9vw, 8rem)" }}
        >
          <div className="flex justify-center lg:justify-start">
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{ width: "100%", maxWidth: "340px", aspectRatio: "4 / 5", boxShadow: "0 24px 60px rgba(18,20,23,0.12)" }}
            >
              <Image
                src="/Dr._Paul_Jenkins.jpg"
                alt="Dr. Paul Jenkins — Clinical Psychologist and creator of Positives"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 80vw, 340px"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase mb-6" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
              Your guide
            </p>
            <h2
              className="font-heading font-bold mb-7"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)", letterSpacing: "-0.045em", lineHeight: "1.06", color: "#121417" }}
            >
              Created by Dr. Paul Jenkins
            </h2>
            <div className="space-y-5 mb-8">
              <p style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.78" }}>
                Dr. Paul Jenkins has spent decades helping people build stronger relationships, healthier thinking, and more resilient lives.
              </p>
              <p style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.78" }}>
                Through his work with families, leaders, and communities, he has helped thousands of people develop the mindset skills that make life calmer, clearer, and more meaningful.
              </p>
              <p style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.78" }}>
                Positives brings the most practical ideas from that work into a simple daily practice anyone can follow, including the kind of mindset habits that help you save and enrich your most important relationships.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Clinical Psychologist", "Bestselling Author", "Keynote Speaker", "30+ Years Research"].map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium px-3.5 py-1.5 rounded-full"
                  style={{ background: "#FFFFFF", border: "1px solid #DDD7CF", color: "#68707A" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━ 8. BENEFITS / THE RESULT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="w-full" style={{ background: "#FFFFFF", borderTop: "1px solid #DDD7CF" }}>
        <div
          className="max-w-6xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
          style={{ paddingTop: "clamp(5rem, 9vw, 8rem)", paddingBottom: "clamp(5rem, 9vw, 8rem)" }}
        >
          <div>
            <p className="text-xs font-semibold uppercase mb-5" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
              The result
            </p>
            <h2
              className="font-heading font-bold"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)", letterSpacing: "-0.045em", lineHeight: "1.06", color: "#121417" }}
            >
              What begins to change
            </h2>
          </div>

          <div>
            <div className="space-y-5 mb-7">
              {[
                "You start the day with clarity instead of stress",
                "You respond instead of reacting emotionally",
                "Your thinking becomes calmer and more intentional",
                "Relationships improve as your mindset shifts",
                "You feel more grounded and resilient",
                "Life becomes something you shape, not just survive",
              ].map((item) => (
                <div key={item} className="flex items-start gap-4">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                    style={{ background: "rgba(78,140,120,0.12)" }}
                    aria-hidden="true"
                  >
                    <CheckIcon />
                  </span>
                  <p style={{ fontSize: "1rem", color: "#3F4650", lineHeight: "1.65" }}>{item}</p>
                </div>
              ))}
            </div>
            <p className="text-sm font-medium" style={{ color: "#9AA0A8", paddingLeft: "2.5rem" }}>
              Small daily shifts create powerful long-term change.
            </p>
          </div>
        </div>
      </section>

      {/* ━━ 8b. TESTIMONIALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="w-full" style={{ background: "#121417", borderTop: "1px solid #1C2028" }}>
        <div
          className="max-w-6xl mx-auto px-5 sm:px-8"
          style={{ paddingTop: "clamp(4rem, 8vw, 7rem)", paddingBottom: "clamp(4rem, 8vw, 7rem)" }}
        >
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase mb-4" style={{ color: "#4E8C78", letterSpacing: "0.14em" }}>
              What members say
            </p>
            <h2
              className="font-heading font-bold mx-auto"
              style={{
                fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.1",
                color: "#FFFFFF",
                maxWidth: "560px",
              }}
            >
              Real people. Real shifts.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {([
              {
                quote: "I've tried meditation apps, journaling, online courses — none of it stuck. Positives is different. It's short enough that I actually do it every morning, and Dr. Paul's voice is remarkably calming. I'm noticeably less reactive at work.",
                name: "Sarah M.",
                location: "Austin, TX",
                highlight: "noticeably less reactive",
              },
              {
                quote: "Dr. Paul's approach changed how I think about everything — not just my 'mindset moments' but my actual daily responses. The weekly principles hit differently each time I revisit them. Worth every dollar.",
                name: "Marcus T.",
                location: "Toronto, ON",
                highlight: "changed how I think about everything",
              },
              {
                quote: "I was skeptical about the price at first. Then I realized I was spending more on a gym membership I rarely used. Three months in, Positives is the one habit I've actually kept. The 30-day guarantee made it easy to start.",
                name: "Renee K.",
                location: "Phoenix, AZ",
                highlight: "the one habit I've actually kept",
              },
              {
                quote: "I started listening during my commute and within two weeks my wife noticed I was handling stress differently. That alone was worth the membership. Dr. Paul explains things in a way that's practical, not preachy.",
                name: "David R.",
                location: "Denver, CO",
                highlight: "my wife noticed I was handling stress differently",
              },
              {
                quote: "I've followed Dr. Paul's podcast for years. The Positives membership is the structured version of everything I love about his teaching — delivered in a way I can actually build a habit around. This is the real deal.",
                name: "Jennifer L.",
                location: "Seattle, WA",
                highlight: "the real deal",
              },
              {
                quote: "I bought it for the daily audio. I stayed for the monthly themes and weekly reflections. Dr. Paul keeps bringing me back to the ideas I need most without making the practice feel heavy or overwhelming.",
                name: "Carlos V.",
                location: "Miami, FL",
                highlight: "the content keeps getting better",
              },
            ] as Array<{ quote: string; name: string; location: string; highlight: string }>).map(({ quote, name, location }) => (
              <div
                key={name}
                className="rounded-2xl p-7 flex flex-col"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4" aria-label="5 stars">
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill="#F5B93E" stroke="none" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#8A9199",
                    lineHeight: "1.78",
                    flex: 1,
                    marginBottom: "1.25rem",
                  }}
                >
                  &ldquo;{quote}&rdquo;
                </p>
                <div>
                  <p className="font-medium" style={{ fontSize: "0.875rem", color: "#CBD2D9" }}>{name}</p>
                  <p style={{ fontSize: "0.8rem", color: "#4A5360" }}>{location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ 9. GUARANTEE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="w-full" style={{ background: "#F6F3EE", borderTop: "1px solid #DDD7CF" }}>
        <div
          className="max-w-6xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start"
          style={{ paddingTop: "clamp(5rem, 9vw, 8rem)", paddingBottom: "clamp(5rem, 9vw, 8rem)" }}
        >
          {/* Left */}
          <div>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8"
              style={{ background: "#FFFFFF", border: "1px solid #DDD7CF" }}
              aria-hidden="true"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase mb-5" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
              Our promise
            </p>
            <h2
              className="font-heading font-bold"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)", letterSpacing: "-0.045em", lineHeight: "1.06", color: "#121417" }}
            >
              30-day money-back guarantee.
            </h2>
          </div>

          {/* Right */}
          <div className="space-y-5" style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.78" }}>
            <p>
              We are confident this practice will make a real difference in your life. But we also understand that trust has to be earned.
            </p>
            <p>
              That&apos;s why every Positives membership comes with an unconditional 30-day money-back guarantee. If you do the practice and it doesn&apos;t meaningfully improve your days, simply email us within 30 days and we&apos;ll refund your membership in full.
            </p>
            <p>
              No hoops to jump through. No questions asked. No hassle.
            </p>
            <p className="font-semibold" style={{ color: "#121417" }}>
              We believe the practice will speak for itself. This guarantee just means there&apos;s nothing to risk.
            </p>
            <div className="pt-2">
              <Link
                href={trackedPaidHref}
                className="inline-flex items-center justify-center font-semibold rounded-full"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  color: "#FFFFFF",
                  boxShadow: "0 8px 28px rgba(47,111,237,0.25)",
                  letterSpacing: "-0.01em",
                  fontSize: "0.95rem",
                  padding: "0.9rem 2rem",
                }}
              >
                {session.paidActionLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ━━ 9b. FAQ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="faq" className="w-full" style={{ background: "#FAFAF8", borderTop: "1px solid rgba(221,215,207,0.55)" }}>
        <div
          className="max-w-3xl mx-auto px-5 sm:px-8"
          style={{ paddingTop: "clamp(4rem, 8vw, 7rem)", paddingBottom: "clamp(4rem, 8vw, 7rem)" }}
        >
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase mb-4" style={{ color: "#4E8C78", letterSpacing: "0.14em" }}>
              FAQ
            </p>
            <h2
              className="font-heading font-bold"
              style={{
                fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.1",
                color: "#121417",
              }}
            >
              Common questions.
            </h2>
          </div>

          <LandingFaq />

          <p className="text-center mt-8 text-sm" style={{ color: "#9AA0A8" }}>
            Still have questions?{" "}
            <Link href={trackedSupportHref} style={{ color: "#2F6FED", textDecoration: "underline" }}>
              Contact support →
            </Link>
          </p>
        </div>
      </section>

      {/* ━━ 10. FINAL CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative w-full text-center overflow-hidden" style={{ background: "#121417", borderTop: "1px solid #1C2028" }}>
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(47,111,237,0.18) 0%, transparent 60%)" }}
        />
        <div
          className="relative max-w-4xl mx-auto px-5 sm:px-8"
          style={{ paddingTop: "clamp(5rem, 10vw, 9rem)", paddingBottom: "clamp(5rem, 10vw, 9rem)" }}
        >
          <h2
            className="font-heading font-bold mb-8"
            style={{
              fontSize: "clamp(2.2rem, 5vw, 4.5rem)",
              lineHeight: "1.04",
              letterSpacing: "-0.05em",
              color: "#FFFFFF",
            }}
            >
              <span className="block sm:whitespace-nowrap">A few minutes each day.</span>
              <span
                className="block sm:whitespace-nowrap"
                style={{
                  background: "linear-gradient(135deg, #6B9BF2 0%, #8FC4B5 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              A more positive life.
            </span>
          </h2>

          <Link
            href={trackedPaidHref}
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
            {session.paidActionLabel}
          </Link>

          <p className="mt-5 text-sm" style={{ color: "#68707A" }}>
            From $37/month · Cancel anytime · 30-day guarantee
          </p>
        </div>
      </section>

      {/* ━━ 11. FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <PublicSiteFooter paidHref={paidHref} trackingParams={trackingParams} session={session} />
    </div>
  );
}

export function LandingPageClient(props: LandingPageClientProps) {
  return <LandingPageShell {...props} />;
}
