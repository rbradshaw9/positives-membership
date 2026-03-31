"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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

export function LandingPageClient() {
  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden" style={{ background: "#FAFAF8" }}>

      {/* ━━ 1. NAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(250,250,248,0.90)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(221,215,207,0.55)",
        }}
      >
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/logos/positives-wordmark-dark.png"
              alt="Positives"
              width={120}
              height={26}
              style={{ height: 26, width: "auto" }}
              priority
            />
          </Link>
          <nav className="flex items-center gap-7" aria-label="Main navigation">
            <Link href="#how-it-works" className="hidden md:block text-sm font-medium transition-colors hover:text-foreground" style={{ color: "#68707A" }}>
              How it Works
            </Link>
            <Link href="#dr-paul" className="hidden md:block text-sm font-medium transition-colors hover:text-foreground" style={{ color: "#68707A" }}>
              Dr. Paul
            </Link>
            <Link href="/login" className="text-sm font-medium transition-colors" style={{ color: "#68707A" }}>
              Sign in
            </Link>
            <Link
              href="/join"
              className="text-sm font-semibold px-5 py-2.5 rounded-full"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                letterSpacing: "-0.01em",
                boxShadow: "0 4px 14px rgba(47,111,237,0.28)",
              }}
            >
              Join
            </Link>
          </nav>
        </div>
      </header>

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

        <div className="relative flex flex-col items-center max-w-4xl mx-auto" style={{ paddingTop: "3.5rem", paddingBottom: "4.5rem" }}>
          {/* Eyebrow */}
          <div className="flex items-center gap-2.5 mb-10">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4E8C78" }} />
            <span className="text-xs font-semibold uppercase" style={{ color: "#4E8C78", letterSpacing: "0.13em" }}>
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
            A few minutes each day.
            <br />
            <span
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
            className="mb-10 mx-auto"
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

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
            <Link
              href="/join"
              className="inline-flex items-center justify-center font-semibold rounded-full"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 8px 28px rgba(47,111,237,0.30)",
                letterSpacing: "-0.01em",
                fontSize: "0.95rem",
                padding: "1rem 2.25rem",
              }}
            >
              Start your practice →
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium" style={{ color: "#68707A" }}>
              See how it works
            </Link>
          </div>

          {/* Micro pricing anchor */}
          <p className="text-sm" style={{ color: "#B0A89E" }}>
            From <span style={{ color: "#68707A" }}>$49/month</span> · Cancel anytime
          </p>
        </div>
      </section>

      {/* ━━ 3. PROBLEM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="w-full" style={{ background: "#121417", borderTop: "1px solid #1C2028" }}>
        <div
          className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
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
          className="max-w-6xl mx-auto px-8"
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
                title: "Monthly Masterclass",
                desc: "Every month, Dr. Paul leads a deep-dive masterclass on one meaningful area of life — relationships, purpose, resilience, and more. This is the heart of the curriculum that ties it all together.",
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
          className="max-w-6xl mx-auto px-8"
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
            <Link href="/join" className="font-medium underline underline-offset-2" style={{ color: "#2F6FED" }}>
              Start your practice
            </Link>
          </p>
        </div>
      </section>

      {/* ━━ 6. THE SYSTEM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="w-full" style={{ background: "#121417", borderTop: "1px solid #1C2028" }}>
        <div
          className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
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
              href="/join"
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
              Start your practice →
            </Link>
          </div>

          <div>
            <div className="space-y-1 mb-8">
              {[
                "Daily guided audio practices",
                "Weekly reflections & mindset principles",
                "Monthly masterclass with Dr. Paul",
                "Member community",
                "Live group sessions",
                "Workshops and coaching opportunities",
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
          className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-12 lg:gap-20 items-center"
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
          className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
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

      {/* ━━ 9. GUARANTEE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="w-full" style={{ background: "#F6F3EE", borderTop: "1px solid #DDD7CF" }}>
        <div
          className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
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
                href="/join"
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
                Start your practice →
              </Link>
            </div>
          </div>
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
          className="relative max-w-4xl mx-auto px-8"
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
            A few minutes each day.{" "}
            <span
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
            Start your practice →
          </Link>

          <p className="mt-5 text-sm" style={{ color: "#68707A" }}>
            From $49/month · Cancel anytime · 30-day guarantee
          </p>
        </div>
      </section>

      {/* ━━ 11. FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="w-full" style={{ background: "#FAFAF8", borderTop: "1px solid rgba(221,215,207,0.55)" }}>
        <div className="max-w-6xl mx-auto px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-6">
            <Link href="/">
              <Image
                src="/logos/positives-wordmark-dark.png"
                alt="Positives"
                width={80}
                height={20}
                style={{ height: 20, width: "auto", opacity: 0.45 }}
              />
            </Link>
            <div className="flex items-center gap-5">
              <Link href="/privacy" className="text-xs" style={{ color: "#9AA0A8" }}>Privacy</Link>
              <Link href="/terms" className="text-xs" style={{ color: "#9AA0A8" }}>Terms</Link>
              <Link href="/login" className="text-xs" style={{ color: "#9AA0A8" }}>Sign in</Link>
            </div>
          </div>
          <span className="text-xs" style={{ color: "#C4BDB5" }}>
            © {new Date().getFullYear()} Positives
          </span>
        </div>
      </footer>
    </div>
  );
}
