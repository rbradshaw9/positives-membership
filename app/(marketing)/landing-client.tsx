"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { StickyCtaBar } from "@/components/marketing/StickyCtaBar";
import { useSearchParams } from "next/navigation";
import { appendPublicTrackingParamsFromEntries } from "@/lib/marketing/public-query-params";
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

/* ─── Landing FAQ Accordion ──────────────────────────────────────────────── */

const LANDING_FAQS = [
  {
    q: "What exactly is Positives?",
    a: "Positives is a daily practice membership built by Dr. Paul Jenkins, a licensed Clinical Psychologist with 30+ years of experience. Each day you get a short guided audio session (5–15 minutes) designed to reset your thinking and help you move through your day with more clarity and calm. Alongside that, you get a weekly mindset principle and a monthly theme from Dr. Paul.",
  },
  {
    q: "How long are the daily sessions?",
    a: "Most daily sessions are 5–15 minutes. They're designed to fit before work, during lunch, or whenever suits your rhythm. You don't need to block off a long window — a few focused minutes is the whole idea.",
  },
  {
    q: "How is Positives different from a meditation app?",
    a: "Meditation apps train you to sit still. Positives trains you to think differently — the kind of mindset work that changes how you respond to stress, make decisions, and show up in relationships. Dr. Paul's approach is backed by 30+ years of clinical psychology, not just breathwork.",
  },
  {
    q: "Is this the same as the Live on Purpose podcast?",
    a: "No — the Live on Purpose Radio podcast is Dr. Paul's free, public show. Positives is a private daily practice created specifically for members. The content goes deeper, is more personal, and is designed to be experienced daily rather than occasionally.",
  },
  {
    q: "What if I miss a day?",
    a: "Every session is always available in your member library. You can listen at any pace, skip days, or circle back. There's no streak requirement or guilt mechanic — Positives is a practice, not a course with a deadline.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Positives now offers a 7-day free trial through our trial-first offer path, and every paid membership also includes a 30-day money-back guarantee. If the practice doesn't meaningfully improve your days within 30 days of paying, email us and we'll refund you in full — no questions asked.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can manage cancellation from your account settings without contacting support. If you cancel, any paid access stays in place through your current billing period.",
  },
  {
    q: "What devices does this work on?",
    a: "Positives works in any modern web browser on any device — phone, tablet, desktop. No app download required. A mobile app is on the roadmap.",
  },
  {
    q: "What is the 'Founding Member' rate?",
    a: "The founding member rate ($37/month or $370/year, down from the standard $97/month) is a special price for early members who join during our launch. Your rate stays locked in permanently — when we raise prices for new members, yours doesn't change.",
  },
  {
    q: "What do the other pricing tiers include?",
    a: "Membership is the foundation. Membership + Events adds live member events plus replay access as those sessions are published. Coaching Circle adds weekly live coaching and replay access. Executive Coaching is the highest-touch option and begins with a Breakthrough Session.",
  },
];

function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div>
      {LANDING_FAQS.map((faq, i) => (
        <div key={faq.q} style={{ borderBottom: "1px solid rgba(221,215,207,0.7)" }}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between text-left gap-4 py-5"
            aria-expanded={openIndex === i}
          >
            <span className="font-medium" style={{ fontSize: "1rem", color: "#121417", lineHeight: "1.5", letterSpacing: "-0.01em" }}>
              {faq.q}
            </span>
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: openIndex === i ? "rgba(47,111,237,0.1)" : "rgba(18,20,23,0.06)",
                transform: openIndex === i ? "rotate(45deg)" : "none",
                transition: "transform 0.2s ease",
              }}
              aria-hidden="true"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={openIndex === i ? "#2F6FED" : "#68707A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
          </button>
          <div style={{ overflow: "hidden", maxHeight: openIndex === i ? "300px" : 0, transition: "max-height 0.3s ease" }}>
            <p style={{ fontSize: "0.975rem", color: "#68707A", lineHeight: "1.78", paddingBottom: "1.25rem" }}>
              {faq.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Audio Player ───────────────────────────────────────────────────────── */

const SAMPLE_AUDIO_URL =
  "https://media.blubrry.com/liveonpurpose/traffic.libsyn.com/liveonpurpose/692_mixdown.mp3";

function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      setLoading(true);
      a.play()
        .then(() => { setPlaying(true); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setCurrentTime(a.currentTime);
      setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
    };
    const onLoaded = () => setDuration(a.duration);
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
    };
  }, []);

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    a.currentTime = pct * a.duration;
  }

  const bars = [2,3,5,7,9,11,14,12,10,13,15,11,9,12,14,11,8,10,12,9,7,10,13,10,8,6,9,11,8,6,4,3,5,7,9,6,4,3];
  const playedBars = Math.round((progress / 100) * bars.length);

  return (
    <div
      className="w-full max-w-lg mx-auto rounded-3xl"
      style={{
        background: "#FFFFFF",
        border: "1px solid #DDD7CF",
        boxShadow: "0 20px 60px rgba(18,20,23,0.08), 0 4px 16px rgba(18,20,23,0.04)",
        overflow: "hidden",
      }}
    >
      <audio ref={audioRef} src={SAMPLE_AUDIO_URL} preload="none" />

      {/* Header */}
      <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid #F1EEE8" }}>
        <p className="text-xs font-semibold uppercase mb-2" style={{ color: "#4E8C78", letterSpacing: "0.12em" }}>
          Sample · Dr. Paul Jenkins
        </p>
        <p
          className="font-heading font-bold"
          style={{ fontSize: "1.15rem", color: "#121417", letterSpacing: "-0.03em", lineHeight: "1.3" }}
        >
          Responding vs. Reacting
        </p>
        <p className="text-sm mt-1" style={{ color: "#9AA0A8" }}>
          Live On Purpose · Podcast Episode
        </p>
      </div>

      {/* Controls */}
      <div className="px-8 py-7">
        {/* Waveform bars */}
        <div className="flex items-center gap-0.5 h-10 mb-4" aria-hidden="true">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full transition-colors duration-100"
              style={{
                height: `${h * 2.4}px`,
                background: i < playedBars ? "rgba(47,111,237,0.85)" : "rgba(18,20,23,0.09)",
              }}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div
          className="w-full rounded-full overflow-hidden mb-4 cursor-pointer"
          style={{ height: "4px", background: "rgba(18,20,23,0.07)" }}
          onClick={seek}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: "#2F6FED", transition: "width 0.1s linear" }}
          />
        </div>

        {/* Time */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-medium tabular-nums" style={{ color: "#2F6FED" }}>
            {fmt(currentTime)}
          </span>
          <span className="text-xs tabular-nums" style={{ color: "#9AA0A8" }}>
            {duration > 0 ? fmt(duration) : "--:--"}
          </span>
        </div>

        {/* Play/Pause */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play sample"}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              boxShadow: "0 8px 24px rgba(47,111,237,0.35)",
            }}
          >
            {loading ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Landing Page Client Component ────────────────────────────────── */

type LandingPageClientProps = {
  session: PublicSessionState;
  signInHref: string;
  paidHref: string;
  watchHref: string;
};

function LandingPageShell({
  session,
  signInHref,
  paidHref,
  watchHref,
}: LandingPageClientProps) {
  const heroSentinelRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden" style={{ background: "#FAFAF8" }}>

      {/* ━━ 1. NAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <PublicSiteHeader
        signInHref={signInHref}
        signInLabel={session.signInLabel}
        primaryCtaHref={paidHref}
        primaryCtaLabel={session.paidShortLabel}
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
          {/* Eyebrow */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8 sm:mb-10 px-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4E8C78" }} />
            <span className="text-[11px] sm:text-xs font-semibold uppercase text-center" style={{ color: "#4E8C78", letterSpacing: "0.13em" }}>
              Dr. Paul Jenkins · Clinical Psychologist
            </span>
          </div>

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
              maxWidth: "520px",
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
              href={paidHref}
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
      <div ref={heroSentinelRef} aria-hidden="true" />

      <StickyCtaBar
        sentinelRef={heroSentinelRef}
        href={paidHref}
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
            <h2
              className="font-heading font-bold mb-5"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)", letterSpacing: "-0.045em", lineHeight: "1.06", color: "#121417" }}
            >
              A simple practice that builds real change.
            </h2>
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
      <section className="w-full text-center" style={{ background: "#FFFFFF", borderTop: "1px solid #DDD7CF" }}>
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

          <AudioPlayer />

          <p className="mt-8 text-sm" style={{ color: "#B0A89E" }}>
            Daily sessions available to members ·{" "}
            <Link href={paidHref} className="font-medium underline underline-offset-2" style={{ color: "#2F6FED" }}>
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
              href={paidHref}
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
                "Live member events at higher levels",
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
                Positives brings the most powerful ideas from that work into a simple daily practice anyone can follow.
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
          className="max-w-6xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
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
                href={paidHref}
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
            <Link href="/support" style={{ color: "#2F6FED", textDecoration: "underline" }}>
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
            href={paidHref}
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
      <PublicSiteFooter paidHref={paidHref} watchHref={watchHref} session={session} />
    </div>
  );
}

function LandingPageTrackedShell(props: LandingPageClientProps) {
  const searchParams = useSearchParams();
  const paidHref = appendPublicTrackingParamsFromEntries(
    props.paidHref,
    searchParams.entries()
  );
  const watchHref = appendPublicTrackingParamsFromEntries(
    props.watchHref,
    searchParams.entries()
  );

  return <LandingPageShell {...props} paidHref={paidHref} watchHref={watchHref} />;
}

export function LandingPageClient(props: LandingPageClientProps) {
  return (
    <Suspense fallback={<LandingPageShell {...props} />}>
      <LandingPageTrackedShell {...props} />
    </Suspense>
  );
}
