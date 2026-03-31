import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/marketing/Logo";

export const metadata = {
  title: "Positives — A few minutes each day. A more positive life.",
  description:
    "Positives is a guided daily practice designed to help you think more clearly, respond more calmly, and build a life you actually enjoy living. From Dr. Paul Jenkins.",
};

/* ─── Inline SVG icons ──────────────────────────────────────────────────── */

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

/* ─── Static audio player placeholder ──────────────────────────────────── */

function AudioPlayerPlaceholder() {
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
      {/* Header */}
      <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid #F1EEE8" }}>
        <p
          className="text-xs font-semibold uppercase mb-2"
          style={{ color: "#4E8C78", letterSpacing: "0.12em" }}
        >
          Sample Session
        </p>
        <p
          className="font-heading font-bold"
          style={{ fontSize: "1.15rem", color: "#121417", letterSpacing: "-0.03em", lineHeight: "1.3" }}
        >
          Responding vs. Reacting
        </p>
        <p className="text-sm mt-1" style={{ color: "#9AA0A8" }}>
          Daily Audio · 6 min
        </p>
      </div>

      {/* Waveform + controls */}
      <div className="px-8 py-7">
        {/* Decorative waveform */}
        <div className="flex items-center gap-0.5 h-10 mb-5" aria-hidden="true">
          {[2,3,5,7,9,11,14,12,10,13,15,11,9,12,14,11,8,10,12,9,7,10,13,10,8,6,9,11,8,6,4,3,5,7,9,6,4,3].map(
            (h, i) => (
              <div
                key={i}
                className="flex-1 rounded-full"
                style={{
                  height: `${h * 2.4}px`,
                  background:
                    i < 2
                      ? "rgba(47,111,237,0.85)"
                      : "rgba(18,20,23,0.09)",
                }}
              />
            )
          )}
        </div>

        {/* Progress bar */}
        <div
          className="w-full rounded-full overflow-hidden mb-4"
          style={{ height: "3px", background: "rgba(18,20,23,0.07)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: "4%", background: "#2F6FED" }}
          />
        </div>

        {/* Time */}
        <div className="flex items-center justify-between mb-6">
          <span
            className="text-xs font-medium tabular-nums"
            style={{ color: "#2F6FED" }}
          >
            0:00
          </span>
          <span className="text-xs tabular-nums" style={{ color: "#9AA0A8" }}>
            6:00
          </span>
        </div>

        {/* Play button */}
        <div className="flex justify-center">
          <button
            type="button"
            aria-label="Play sample (coming soon)"
            className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              boxShadow: "0 8px 24px rgba(47,111,237,0.35)",
              cursor: "default",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="#FFFFFF"
              aria-hidden="true"
            >
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: member } = await supabase
      .from("member")
      .select("subscription_status")
      .eq("id", user.id)
      .single();
    if (member?.subscription_status === "active") redirect("/today");
  }

  return (
    <div
      className="min-h-dvh flex flex-col overflow-x-hidden"
      style={{ background: "#FAFAF8" }}
    >
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. NAVIGATION
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
          {/* Left */}
          <Logo height={26} />

          {/* Right */}
          <nav className="flex items-center gap-7" aria-label="Main navigation">
            <Link
              href="#how-it-works"
              className="hidden md:block text-sm font-medium transition-colors hover:text-foreground"
              style={{ color: "#68707A" }}
            >
              How it Works
            </Link>
            <Link
              href="#dr-paul"
              className="hidden md:block text-sm font-medium transition-colors hover:text-foreground"
              style={{ color: "#68707A" }}
            >
              Dr. Paul
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium transition-colors"
              style={{ color: "#68707A" }}
            >
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. HERO
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full flex flex-col items-center justify-center text-center px-6 overflow-hidden"
        style={{
          minHeight: "calc(100dvh - 57px)",
          background: "#FAFAF8",
        }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(47,111,237,0.07) 0%, transparent 60%)",
          }}
        />

        <div className="relative flex flex-col items-center max-w-4xl mx-auto">
          {/* Eyebrow */}
          <div className="flex items-center gap-2.5 mb-8">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#4E8C78" }}
            />
            <span
              className="text-xs font-semibold uppercase"
              style={{ color: "#4E8C78", letterSpacing: "0.13em" }}
            >
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
                background:
                  "linear-gradient(135deg, #2F6FED 20%, #4E8C78 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              A more positive life.
            </span>
          </h1>

          {/* Subheadline */}
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
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Link
              href="/join"
              className="inline-flex items-center justify-center font-semibold rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 8px 28px rgba(47,111,237,0.30)",
                letterSpacing: "-0.01em",
                fontSize: "0.95rem",
                padding: "1rem 2.25rem",
              }}
            >
              Start your practice →
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium"
              style={{ color: "#68707A" }}
            >
              See how it works
            </Link>
          </div>

          {/* Micro pricing anchor */}
          <p className="text-sm" style={{ color: "#B0A89E" }}>
            From{" "}
            <span style={{ color: "#68707A" }}>$49/month</span>
            {" "}· Founding member rate · Cancel anytime
          </p>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. PROBLEM
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full"
        style={{
          background: "#121417",
          borderTop: "1px solid #1C2028",
        }}
      >
        <div
          className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start"
          style={{
            paddingTop: "clamp(4.5rem, 8vw, 7.5rem)",
            paddingBottom: "clamp(4.5rem, 8vw, 7.5rem)",
          }}
        >
          {/* Left: Headline */}
          <div className="lg:sticky lg:top-32">
            <h2
              className="font-heading font-bold"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 4rem)",
                lineHeight: "1.05",
                letterSpacing: "-0.045em",
                color: "#FFFFFF",
              }}
            >
              Life moves fast.
              <br />
              <span style={{ color: "#3A4148" }}>
                Your mind moves faster.
              </span>
            </h2>
          </div>

          {/* Right: Body */}
          <div
            className="space-y-5"
            style={{
              fontSize: "1.05rem",
              color: "#8A9199",
              lineHeight: "1.78",
            }}
          >
            <p>Most people spend their days reacting.</p>
            <div
              className="space-y-2 pl-5"
              style={{ borderLeft: "2px solid rgba(255,255,255,0.06)" }}
            >
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
            <p>
              Just a few minutes each day can change how you experience the
              rest of it.
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. THE PRACTICE
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="how-it-works"
        className="w-full"
        style={{
          background: "#F6F3EE",
          borderTop: "1px solid #DDD7CF",
        }}
      >
        <div
          className="max-w-6xl mx-auto px-8"
          style={{
            paddingTop: "clamp(4.5rem, 8vw, 7.5rem)",
            paddingBottom: "clamp(4.5rem, 8vw, 7.5rem)",
          }}
        >
          {/* Section header */}
          <div className="max-w-xl mb-16">
            <p
              className="text-xs font-semibold uppercase mb-5"
              style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
            >
              The practice
            </p>
            <h2
              className="font-heading font-bold mb-5"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                letterSpacing: "-0.045em",
                lineHeight: "1.07",
                color: "#121417",
              }}
            >
              A simple practice that builds real change.
            </h2>
            <p style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.72" }}>
              Positives isn&apos;t about motivation.
              {" "}It&apos;s about building a mindset practice that works every day.
            </p>
          </div>

          {/* Three columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-12">
            {[
              {
                freq: "Daily",
                accent: "#2F6FED",
                title: "Daily Practice",
                body1:
                  "Short guided audio designed to reset your thinking and refocus your day.",
                body2:
                  "Just a few minutes is enough to shift your perspective and move forward with clarity.",
              },
              {
                freq: "Weekly",
                accent: "#4E8C78",
                title: "Weekly Principle",
                body1:
                  "Each week introduces a powerful concept from positive psychology and practical life philosophy.",
                body2:
                  "These ideas deepen the practice and help you understand why the mindset works.",
              },
              {
                freq: "Monthly",
                accent: "#D98A4E",
                title: "Monthly Theme",
                body1:
                  "Every month focuses on one meaningful area of life — relationships, purpose, resilience, and more.",
                body2:
                  "The result is steady growth that compounds over time.",
              },
            ].map(({ freq, accent, title, body1, body2 }) => (
              <div key={freq}>
                <div className="flex items-center gap-3 mb-5">
                  <span
                    className="inline-block text-xs font-bold uppercase px-3 py-1 rounded-full"
                    style={{
                      color: accent,
                      background: `${accent}14`,
                      letterSpacing: "0.10em",
                    }}
                  >
                    {freq}
                  </span>
                </div>
                <h3
                  className="font-heading font-semibold mb-4"
                  style={{
                    fontSize: "1.15rem",
                    letterSpacing: "-0.025em",
                    lineHeight: "1.3",
                    color: "#121417",
                  }}
                >
                  {title}
                </h3>
                <p
                  className="mb-3"
                  style={{
                    fontSize: "0.95rem",
                    color: "#68707A",
                    lineHeight: "1.75",
                  }}
                >
                  {body1}
                </p>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#9AA0A8",
                    lineHeight: "1.75",
                  }}
                >
                  {body2}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. TRY THE PRACTICE
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full text-center"
        style={{
          background: "#FFFFFF",
          borderTop: "1px solid #DDD7CF",
        }}
      >
        <div
          className="max-w-6xl mx-auto px-8"
          style={{
            paddingTop: "clamp(4.5rem, 8vw, 7.5rem)",
            paddingBottom: "clamp(4.5rem, 8vw, 7.5rem)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase mb-5"
            style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
          >
            Sample
          </p>
          <h2
            className="font-heading font-bold mb-5"
            style={{
              fontSize: "clamp(2rem, 4vw, 3.25rem)",
              letterSpacing: "-0.045em",
              lineHeight: "1.07",
              color: "#121417",
            }}
          >
            Try today&apos;s practice
          </h2>
          <p
            className="mb-12 mx-auto"
            style={{
              fontSize: "1.05rem",
              color: "#68707A",
              lineHeight: "1.72",
              maxWidth: "440px",
            }}
          >
            Experience a sample daily session and see how a few minutes of
            guided thinking can shift your day.
          </p>

          <AudioPlayerPlaceholder />

          <p className="mt-8 text-sm" style={{ color: "#B0A89E" }}>
            Full sessions available to members ·{" "}
            <Link
              href="/join"
              className="font-medium underline underline-offset-2"
              style={{ color: "#2F6FED" }}
            >
              Start your practice
            </Link>
          </p>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. THE POSITIVES SYSTEM
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full"
        style={{
          background: "#121417",
          borderTop: "1px solid #1C2028",
        }}
      >
        <div
          className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start"
          style={{
            paddingTop: "clamp(4.5rem, 8vw, 7.5rem)",
            paddingBottom: "clamp(4.5rem, 8vw, 7.5rem)",
          }}
        >
          {/* Left: copy */}
          <div className="lg:sticky lg:top-32">
            <p
              className="text-xs font-semibold uppercase mb-6"
              style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
            >
              The system
            </p>
            <h2
              className="font-heading font-bold mb-7"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                letterSpacing: "-0.045em",
                lineHeight: "1.07",
                color: "#FFFFFF",
              }}
            >
              A complete system for living more positively.
            </h2>
            <div
              className="space-y-4 mb-8"
              style={{
                fontSize: "1.05rem",
                color: "#8A9199",
                lineHeight: "1.78",
              }}
            >
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
                background:
                  "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 8px 28px rgba(47,111,237,0.30)",
                letterSpacing: "-0.01em",
                fontSize: "0.95rem",
                padding: "0.9rem 2rem",
              }}
            >
              Start your practice →
            </Link>
          </div>

          {/* Right: benefits grid */}
          <div>
            <div className="space-y-5 mb-8">
              {[
                "Daily guided practices",
                "Weekly mindset principles",
                "Monthly growth themes",
                "Member community",
                "Live group sessions",
                "Workshops and coaching opportunities",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-4 py-4"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                    style={{ background: "rgba(78,140,120,0.15)" }}
                    aria-hidden="true"
                  >
                    <CheckIcon color="#4E8C78" />
                  </span>
                  <span
                    className="font-medium"
                    style={{
                      fontSize: "1rem",
                      color: "#CBD2D9",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm" style={{ color: "#4A5360" }}>
              Start with the core practice and grow into the rest.
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          7. ABOUT DR. PAUL
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="dr-paul"
        className="w-full"
        style={{
          background: "#F6F3EE",
          borderTop: "1px solid #DDD7CF",
        }}
      >
        <div
          className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start"
          style={{
            paddingTop: "clamp(4.5rem, 8vw, 7.5rem)",
            paddingBottom: "clamp(4.5rem, 8vw, 7.5rem)",
          }}
        >
          {/* Left */}
          <div>
            <p
              className="text-xs font-semibold uppercase mb-6"
              style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
            >
              Your guide
            </p>
            <h2
              className="font-heading font-bold"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                letterSpacing: "-0.045em",
                lineHeight: "1.07",
                color: "#121417",
              }}
            >
              Created by Dr. Paul Jenkins
            </h2>
          </div>

          {/* Right */}
          <div className="lg:pt-4 space-y-5">
            <p style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.78" }}>
              Dr. Paul Jenkins has spent decades helping people build stronger
              relationships, healthier thinking, and more resilient lives.
            </p>
            <p style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.78" }}>
              Through his work with families, leaders, and communities, he has
              helped thousands of people develop the mindset skills that make
              life calmer, clearer, and more meaningful.
            </p>
            <p style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.78" }}>
              Positives brings the most powerful ideas from that work into a
              simple daily practice anyone can follow.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                "Clinical Psychologist",
                "Bestselling Author",
                "Keynote Speaker",
                "30+ Years Research",
              ].map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium px-3.5 py-1.5 rounded-full"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #DDD7CF",
                    color: "#68707A",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          8. BENEFITS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full"
        style={{
          background: "#FFFFFF",
          borderTop: "1px solid #DDD7CF",
        }}
      >
        <div
          className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
          style={{
            paddingTop: "clamp(4.5rem, 8vw, 7.5rem)",
            paddingBottom: "clamp(4.5rem, 8vw, 7.5rem)",
          }}
        >
          {/* Left */}
          <div>
            <p
              className="text-xs font-semibold uppercase mb-5"
              style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
            >
              The result
            </p>
            <h2
              className="font-heading font-bold"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                letterSpacing: "-0.045em",
                lineHeight: "1.07",
                color: "#121417",
              }}
            >
              What begins to change
            </h2>
          </div>

          {/* Right */}
          <div>
            <div className="space-y-5 mb-7">
              {[
                "You start the day with clarity instead of stress",
                "You respond instead of reacting emotionally",
                "Your thinking becomes calmer and more intentional",
                "Relationships improve as your mindset shifts",
                "You feel more grounded and resilient",
              ].map((item) => (
                <div key={item} className="flex items-start gap-4">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                    style={{ background: "rgba(78,140,120,0.12)" }}
                    aria-hidden="true"
                  >
                    <CheckIcon />
                  </span>
                  <p style={{ fontSize: "1rem", color: "#3F4650", lineHeight: "1.65" }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: "#9AA0A8", paddingLeft: "2.5rem" }}
            >
              Small daily shifts create powerful long-term change.
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          9. RISK REVERSAL
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full text-center"
        style={{
          background: "#F6F3EE",
          borderTop: "1px solid #DDD7CF",
        }}
      >
        <div
          className="max-w-xl mx-auto px-8"
          style={{
            paddingTop: "clamp(4.5rem, 8vw, 7.5rem)",
            paddingBottom: "clamp(4.5rem, 8vw, 7.5rem)",
          }}
        >
          {/* Shield icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-8"
            style={{ background: "#FFFFFF", border: "1px solid #DDD7CF" }}
            aria-hidden="true"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4E8C78"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>

          <h2
            className="font-heading font-bold mb-6"
            style={{
              fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)",
              letterSpacing: "-0.04em",
              lineHeight: "1.1",
              color: "#121417",
            }}
          >
            Try Positives for 30 days.
          </h2>

          <div
            className="space-y-4"
            style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.78" }}
          >
            <p>
              If the practice doesn&apos;t meaningfully improve your days, simply
              email us and we&apos;ll refund your membership.
            </p>
            <p>
              No hassle.
              <br />
              No questions.
            </p>
            <p className="font-medium" style={{ color: "#121417" }}>
              We believe the practice will speak for itself.
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          10. FINAL CTA
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full text-center overflow-hidden"
        style={{
          background: "#121417",
          borderTop: "1px solid #1C2028",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% -10%, rgba(47,111,237,0.14) 0%, transparent 60%)",
          }}
        />
        <div
          className="relative max-w-xl mx-auto px-8"
          style={{
            paddingTop: "clamp(5rem, 10vw, 9rem)",
            paddingBottom: "clamp(5rem, 10vw, 9rem)",
          }}
        >
          <h2
            className="font-heading font-bold mb-8"
            style={{
              fontSize: "clamp(2.2rem, 5.5vw, 5rem)",
              lineHeight: "1.03",
              letterSpacing: "-0.05em",
              color: "#FFFFFF",
            }}
          >
            A few minutes each day.
            <br />
            <span style={{ color: "#3A4148" }}>A more positive life.</span>
          </h2>

          <Link
            href="/join"
            className="inline-flex items-center justify-center font-semibold rounded-full"
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              color: "#FFFFFF",
              boxShadow: "0 8px 32px rgba(47,111,237,0.35)",
              letterSpacing: "-0.01em",
              fontSize: "0.95rem",
              padding: "1rem 2.5rem",
            }}
          >
            Start your practice →
          </Link>

          <p className="mt-5 text-sm" style={{ color: "#3A4148" }}>
            Founding member rate · $49/month
          </p>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          11. FOOTER
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer
        className="w-full"
        style={{
          background: "#FAFAF8",
          borderTop: "1px solid rgba(221,215,207,0.55)",
        }}
      >
        <div
          className="max-w-6xl mx-auto px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-5"
        >
          {/* Left: Logo + links */}
          <div className="flex items-center gap-6">
            <Logo height={20} href={null} className="opacity-50" />
            <div className="flex items-center gap-5">
              <Link
                href="/privacy"
                className="text-xs"
                style={{ color: "#9AA0A8" }}
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-xs"
                style={{ color: "#9AA0A8" }}
              >
                Terms
              </Link>
              <Link
                href="/login"
                className="text-xs"
                style={{ color: "#9AA0A8" }}
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Right: Copyright */}
          <span className="text-xs" style={{ color: "#C4BDB5" }}>
            © {new Date().getFullYear()} Positives
          </span>
        </div>
      </footer>
    </div>
  );
}
