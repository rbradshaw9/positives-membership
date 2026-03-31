import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/marketing/Logo";

export const metadata = {
  title: "Positives — A few minutes each day. A more positive life.",
  description:
    "Positives is a guided daily practice with Dr. Paul Jenkins — daily audio, weekly principles, and monthly masterclasses to help you think more clearly, respond more calmly, and build a life you actually enjoy living.",
};

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
      style={{ background: "#F6F3EE" }}
    >

      {/* ━━ NAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(246,243,238,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(221,215,207,0.6)",
        }}
      >
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Logo height={26} />
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-medium"
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
              Start today
            </Link>
          </div>
        </div>
      </header>

      {/* ━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full"
        style={{ overflow: "hidden", minHeight: "calc(100vh - 57px)" }}
      >
        {/* ambient glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 70% 20%, rgba(47,111,237,0.07) 0%, transparent 55%), radial-gradient(ellipse at 10% 80%, rgba(78,140,120,0.06) 0%, transparent 50%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 items-center min-h-[calc(100vh-57px)]">

          {/* LEFT: Copy */}
          <div className="py-20 lg:py-0 lg:pr-16 flex flex-col justify-center">

            <div className="flex items-center gap-2.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4E8C78" }} />
              <span
                className="text-xs font-semibold uppercase"
                style={{ color: "#4E8C78", letterSpacing: "0.12em" }}
              >
                Dr. Paul Jenkins · Clinical Psychologist
              </span>
            </div>

            <h1
              className="font-heading font-bold mb-7"
              style={{
                fontSize: "clamp(2.8rem, 5.2vw, 5.25rem)",
                lineHeight: "1.03",
                letterSpacing: "-0.045em",
                color: "#121417",
              }}
            >
              A few minutes each day.{" "}
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

            <p
              className="mb-9"
              style={{
                fontSize: "1.1rem",
                color: "#68707A",
                lineHeight: "1.72",
                maxWidth: "460px",
                letterSpacing: "-0.01em",
              }}
            >
              Positives is a guided daily practice designed to help you think more
              clearly, respond more calmly, and build a life you actually enjoy living.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
              <Link
                href="/join"
                className="inline-flex items-center justify-center font-semibold px-8 py-4 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  color: "#FFFFFF",
                  boxShadow: "0 8px 28px rgba(47,111,237,0.30)",
                  letterSpacing: "-0.01em",
                  fontSize: "0.95rem",
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

            <p className="text-sm" style={{ color: "#9AA0A8" }}>
              From{" "}
              <span style={{ color: "#3F4650", fontWeight: 600 }}>$49/month</span>
              {" "}· Cancel anytime · Secure checkout
            </p>
          </div>

          {/* RIGHT: Product Preview Card */}
          <div className="hidden lg:flex flex-col justify-center items-center py-16" aria-hidden="true">
            <div className="relative w-full max-w-sm xl:max-w-md">
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: "radial-gradient(ellipse at 50% 60%, rgba(47,111,237,0.16) 0%, transparent 70%)",
                  transform: "scale(1.15) translateY(8%)",
                  filter: "blur(28px)",
                }}
              />
              <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #DDD7CF",
                  boxShadow: "0 24px 64px rgba(18,20,23,0.10), 0 4px 16px rgba(18,20,23,0.06)",
                }}
              >
                {/* Today's audio */}
                <div className="px-7 pt-7 pb-5" style={{ borderBottom: "1px solid #F1EEE8" }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-xs font-semibold uppercase mb-1"
                        style={{ color: "#4E8C78", letterSpacing: "0.12em" }}>Today</p>
                      <p className="font-heading font-bold"
                        style={{ fontSize: "1.05rem", color: "#121417", letterSpacing: "-0.03em" }}>
                        Daily Grounding Practice
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: "#F6F3EE", border: "1px solid #DDD7CF" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#2F6FED">
                        <path d="M5 3l14 9-14 9V3z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 h-8 mb-3">
                    {[3,5,8,6,9,12,14,10,8,11,13,9,7,11,14,12,9,6,8,10,7,5,9,11,8,6,4,7,9,6,4,3].map(
                      (h, i) => (
                        <div key={i} className="flex-1 rounded-full"
                          style={{
                            height: `${h * 2}px`,
                            background: i < 10 ? "rgba(47,111,237,0.85)" : "rgba(18,20,23,0.10)",
                          }} />
                      )
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium tabular-nums" style={{ color: "#2F6FED" }}>3:12</span>
                    <span className="text-xs" style={{ color: "#68707A" }}>8:00</span>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height: "3px", background: "rgba(18,20,23,0.07)" }}>
                    <div className="h-full rounded-full" style={{ width: "40%", background: "#2F6FED" }} />
                  </div>
                </div>

                {/* This month's masterclass */}
                <div className="px-7 py-5" style={{ borderBottom: "1px solid #F1EEE8" }}>
                  <p className="text-xs font-semibold uppercase mb-3" style={{ color: "#68707A", letterSpacing: "0.10em" }}>
                    This month
                  </p>
                  <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "#F6F3EE" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(47,111,237,0.10)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2F6FED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-0.5" style={{ color: "#121417", letterSpacing: "-0.01em" }}>
                        Masterclass: Your Relationship With Yourself
                      </p>
                      <p className="text-xs" style={{ color: "#68707A" }}>Live with Dr. Paul · April</p>
                    </div>
                  </div>
                </div>

                {/* This week */}
                <div className="px-7 py-4" style={{ borderBottom: "1px solid #F1EEE8" }}>
                  <p className="text-xs font-semibold uppercase mb-3" style={{ color: "#68707A", letterSpacing: "0.10em" }}>
                    This week
                  </p>
                  <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "#F6F3EE" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(78,140,120,0.12)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-0.5" style={{ color: "#121417", letterSpacing: "-0.01em" }}>
                        Weekly Principle: The practice of perspective
                      </p>
                      <p className="text-xs" style={{ color: "#68707A" }}>Week 4 · one practice attached</p>
                    </div>
                  </div>
                </div>

                {/* Streak */}
                <div className="px-7 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D98A4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "#121417", letterSpacing: "-0.02em" }}>
                          12-day streak
                        </p>
                        <p className="text-xs" style={{ color: "#68707A" }}>Keep going</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {[true,true,true,true,true,false,false].map((done, i) => (
                        <div key={i} className="w-2 h-2 rounded-full"
                          style={{ background: done ? "#4E8C78" : "rgba(18,20,23,0.10)" }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating label */}
              <div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #DDD7CF",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  boxShadow: "0 4px 12px rgba(18,20,23,0.06)",
                }}
              >
                <p className="text-xs font-medium" style={{ color: "#68707A" }}>
                  Daily practice · every morning
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━ THE PROBLEM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full"
        style={{
          borderTop: "1px solid #DDD7CF",
          background: "#121417",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            inset: 0,
            background: "radial-gradient(ellipse at 80% 50%, rgba(47,111,237,0.07) 0%, transparent 60%)",
          }}
        />
        <div
          className="relative max-w-7xl mx-auto px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start"
        >
          <div>
            <h2
              className="font-heading font-bold"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                lineHeight: "1.05",
                letterSpacing: "-0.04em",
                color: "#FFFFFF",
              }}
            >
              Life moves fast.{" "}
              <span style={{ color: "#4A5360" }}>Your mind moves faster.</span>
            </h2>
          </div>
          <div className="space-y-5" style={{ fontSize: "1.05rem", color: "#8A9199", lineHeight: "1.75" }}>
            <p>Most people spend their days reacting.</p>
            <div className="space-y-1.5 pl-5" style={{ borderLeft: "2px solid rgba(255,255,255,0.06)" }}>
              <p>To stress.</p>
              <p>To news.</p>
              <p>To expectations.</p>
              <p>To other people&apos;s emotions.</p>
            </div>
            <p>It&apos;s exhausting.</p>
            <p className="font-medium" style={{ color: "#CBD2D9" }}>
              Positives is a daily mental reset — a structured practice that helps
              you slow down, see clearly, and respond with intention.
            </p>
            <p>Just a few minutes each day can change how you experience the rest of it.</p>
          </div>
        </div>
      </section>

      {/* ━━ HOW YOUR PRACTICE WORKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="how-it-works"
        className="relative w-full px-8 py-24"
        style={{ background: "#F6F3EE", borderTop: "1px solid #DDD7CF" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-14 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase mb-3"
                style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
                The practice
              </p>
              <h2
                className="font-heading font-bold"
                style={{
                  fontSize: "clamp(1.9rem, 3.5vw, 2.75rem)",
                  letterSpacing: "-0.04em",
                  lineHeight: "1.1",
                  color: "#121417",
                }}
              >
                A simple practice that builds{" "}
                <span style={{ color: "#4E8C78" }}>real change.</span>
              </h2>
            </div>
            <Link
              href="/join"
              className="self-start lg:self-auto text-sm font-semibold"
              style={{ color: "#2F6FED", letterSpacing: "-0.01em" }}
            >
              See what&apos;s included →
            </Link>
          </div>

          {/* Three-layer rhythm */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {[
              {
                label: "Daily",
                number: "01",
                title: "A short guided reset — every morning",
                body: "A fresh 5–10 minute audio message from Dr. Paul, every single day. Grounding, perspective, and a specific tool to carry into your day. Just a few minutes is enough to shift your thinking.",
                accent: "#2F6FED",
                bg: "rgba(47,111,237,0.04)",
                border: "rgba(47,111,237,0.12)",
              },
              {
                label: "Weekly",
                number: "02",
                title: "A powerful concept with a clear practice",
                body: "Each week introduces a research-backed principle from positive psychology — tied to the monthly theme — with one specific practice attached. These ideas deepen the habit and help it stick.",
                accent: "#4E8C78",
                bg: "rgba(78,140,120,0.05)",
                border: "rgba(78,140,120,0.14)",
              },
              {
                label: "Monthly",
                number: "03",
                title: "A live masterclass with Dr. Paul",
                body: "Every month, Dr. Paul teaches a live masterclass on one meaningful area of life — relationships, purpose, resilience, and more — drawn from his Seven Key Relationships framework and 30 years of research.",
                accent: "#D98A4E",
                bg: "rgba(217,138,78,0.05)",
                border: "rgba(217,138,78,0.14)",
              },
            ].map(({ label, number, title, body, accent, bg, border }) => (
              <div key={label}
                className="relative rounded-3xl p-8 flex flex-col overflow-hidden"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <span
                  className="absolute top-4 right-5 font-heading font-bold select-none pointer-events-none"
                  style={{ fontSize: "4.5rem", lineHeight: 1, color: accent, opacity: 0.07 }}
                  aria-hidden="true"
                >
                  {number}
                </span>
                <span
                  className="inline-block text-xs font-bold uppercase mb-5 px-3 py-1 rounded-full w-fit"
                  style={{ color: accent, background: `${accent}14`, letterSpacing: "0.10em" }}
                >
                  {label}
                </span>
                <h3 className="font-heading font-semibold mb-3"
                  style={{ fontSize: "1.075rem", letterSpacing: "-0.02em", color: "#121417", lineHeight: "1.35" }}>
                  {title}
                </h3>
                <p className="text-sm flex-1" style={{ color: "#68707A", lineHeight: "1.72" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>

          {/* Seven Key Relationships callout */}
          <div
            className="rounded-3xl px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-5"
            style={{
              background: "linear-gradient(135deg, rgba(47,111,237,0.05) 0%, rgba(78,140,120,0.05) 100%)",
              border: "1px solid rgba(47,111,237,0.10)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#FFFFFF", border: "1px solid #DDD7CF" }}
              aria-hidden="true"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6FED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <div>
              <p className="font-heading font-semibold mb-1"
                style={{ fontSize: "1rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Built on the Seven Key Relationships Framework
              </p>
              <p className="text-sm" style={{ color: "#68707A", lineHeight: "1.65", maxWidth: "560px" }}>
                Dr. Paul&apos;s research shows that life satisfaction is shaped by seven core
                relationships — with yourself, your partner, family, friends, your work, your
                community, and your spiritual life. Each monthly masterclass explores one,
                giving your practice a clear direction that evolves through the year.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━ DR. PAUL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full px-8 py-24"
        style={{ background: "#121417", overflow: "hidden", borderTop: "1px solid #1E2228" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 40%, rgba(47,111,237,0.09) 0%, transparent 55%), radial-gradient(ellipse at 15% 75%, rgba(78,140,120,0.06) 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-semibold uppercase mb-6"
              style={{ color: "#4E8C78", letterSpacing: "0.14em" }}>
              Created by
            </p>
            <h2
              className="font-heading font-bold mb-5"
              style={{
                fontSize: "clamp(1.9rem, 3.8vw, 3.25rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.08",
                color: "#FFFFFF",
              }}
            >
              Dr. Paul Jenkins
            </h2>
            <p className="text-base mb-8"
              style={{ color: "#8A9199", lineHeight: "1.75", maxWidth: "400px" }}>
              Dr. Paul Jenkins has spent decades helping people build stronger
              relationships, healthier thinking, and more resilient lives. Through his work
              with families, leaders, and communities, he has helped thousands develop the
              mindset skills that make life calmer, clearer, and more meaningful.
            </p>
            <p style={{ color: "#8A9199", lineHeight: "1.75", maxWidth: "400px", fontSize: "1rem" }}>
              Positives brings the most powerful ideas from that work into a simple daily
              practice anyone can follow.
            </p>
            <div className="flex flex-wrap gap-2 mt-7">
              {["Clinical Psychologist", "Bestselling Author", "Keynote Speaker", "30+ years research"].map((tag) => (
                <span key={tag} className="text-xs font-medium px-3.5 py-1.5 rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#7A8390",
                  }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div
            className="relative p-9 rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.065)",
            }}
          >
            <div
              className="absolute font-heading font-bold select-none"
              style={{ top: "-6px", left: "28px", fontSize: "5rem", lineHeight: 1, color: "rgba(47,111,237,0.18)" }}
              aria-hidden="true"
            >
              &ldquo;
            </div>
            <p
              className="font-heading font-semibold relative z-10 mt-4"
              style={{
                fontSize: "1.2rem",
                lineHeight: "1.62",
                color: "#FFFFFF",
                letterSpacing: "-0.02em",
              }}
            >
              Positivity is a skill. It gets stronger with deliberate, consistent
              practice. Most people never train it intentionally. Positives exists so you can.
            </p>
            <p className="mt-6 text-sm font-medium" style={{ color: "#4A5360" }}>
              — Dr. Paul Jenkins, Ph.D.
            </p>
          </div>
        </div>
      </section>

      {/* ━━ WHAT'S INCLUDED ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full px-8 py-24"
        style={{ background: "#FFFFFF", borderTop: "1px solid #DDD7CF" }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase mb-5"
              style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
              Level 1 — Membership
            </p>
            <h2
              className="font-heading font-bold mb-5"
              style={{
                fontSize: "clamp(1.9rem, 3.5vw, 3rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.1",
                color: "#121417",
              }}
            >
              Everything you get{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #4E8C78 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                on day one.
              </span>
            </h2>
            <p className="text-base mb-2"
              style={{ color: "#68707A", lineHeight: "1.75", maxWidth: "340px" }}>
              The moment you join, you have full access to everything — including every
              past masterclass, all past weekly principles, and the complete audio library.
            </p>
            <div className="mt-7">
              <Link
                href="/join"
                className="inline-flex items-center justify-center font-semibold text-sm px-7 py-3.5 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  color: "#FFFFFF",
                  boxShadow: "0 6px 20px rgba(47,111,237,0.26)",
                  letterSpacing: "-0.01em",
                }}
              >
                Join Positives today →
              </Link>
            </div>
          </div>

          <ul className="space-y-4">
            {[
              {
                title: "Monthly masterclass with Dr. Paul",
                sub: "A live, in-depth teaching every month on one dimension of positivity — drawn from his Seven Key Relationships framework and 30 years of research. All past masterclasses included.",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6FED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                ),
                iconBg: "rgba(47,111,237,0.10)",
              },
              {
                title: "Daily grounding audio — every morning",
                sub: "A fresh 5–10 minute message from Dr. Paul, every single day. Grounding, perspective, and a specific tool to carry into your day. Hundreds in the library.",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                ),
                iconBg: "rgba(78,140,120,0.10)",
              },
              {
                title: "Weekly principles & practices",
                sub: "One research-backed principle each week — with a specific practice attached. Your weekly work deepens your daily habit and compounds over time.",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D98A4E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                ),
                iconBg: "rgba(217,138,78,0.10)",
              },
              {
                title: "Complete content library",
                sub: "Every past masterclass, daily audio, weekly principle, workshop, and resource — searchable and available on demand.",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6FED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                ),
                iconBg: "rgba(47,111,237,0.10)",
              },
              {
                title: "Private podcast feed",
                sub: "Your daily audios and weekly content delivered to Apple Podcasts, Spotify, or any podcast app — so Positives fits naturally into your existing morning routine.",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="2" />
                    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
                  </svg>
                ),
                iconBg: "rgba(78,140,120,0.10)",
              },
              {
                title: "Reflection prompts & private journal",
                sub: "Guided reflection after each session. Write privately, track your thinking over time, and watch yourself grow — one entry at a time.",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D98A4E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                ),
                iconBg: "rgba(217,138,78,0.10)",
              },
            ].map(({ title, sub, icon, iconBg }) => (
              <li key={title}
                className="flex items-start gap-4 p-5 rounded-2xl"
                style={{ background: "#F6F3EE", border: "1px solid #ECE7DF" }}>
                <span
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: iconBg, border: "1px solid rgba(18,20,23,0.06)" }}
                  aria-hidden="true"
                >
                  {icon}
                </span>
                <div>
                  <p className="font-semibold text-sm mb-1"
                    style={{ color: "#121417", letterSpacing: "-0.01em" }}>
                    {title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "#68707A" }}>
                    {sub}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ━━ WHAT BEGINS TO CHANGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full px-8 py-20"
        style={{
          background: "linear-gradient(135deg, #F1EEE8 0%, #E8E2D8 100%)",
          borderTop: "1px solid #DDD7CF",
        }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-semibold uppercase mb-4"
              style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
              The result
            </p>
            <h2
              className="font-heading font-bold"
              style={{
                fontSize: "clamp(1.8rem, 3.2vw, 2.75rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.1",
                color: "#121417",
              }}
            >
              What begins to change
            </h2>
            <p className="mt-4 text-sm font-medium" style={{ color: "#9AA0A8", lineHeight: "1.6" }}>
              Small daily shifts create powerful long-term change.
            </p>
          </div>
          <div className="space-y-4">
            {[
              "You start the day with clarity instead of stress",
              "You respond instead of reacting emotionally",
              "Your thinking becomes calmer and more intentional",
              "Relationships improve as your mindset shifts",
              "You feel more grounded and resilient over time",
            ].map((item) => (
              <div key={item} className="flex items-start gap-4">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                  style={{ background: "rgba(78,140,120,0.18)" }}
                  aria-hidden="true"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <p style={{ fontSize: "1rem", color: "#3F4650", lineHeight: "1.65" }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ HIGHER LEVELS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full px-8 py-16"
        style={{ background: "#F6F3EE", borderTop: "1px solid #DDD7CF" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase mb-3"
              style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
              Want more?
            </p>
            <h2
              className="font-heading font-bold mb-3"
              style={{
                fontSize: "clamp(1.6rem, 2.8vw, 2.1rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.1",
                color: "#121417",
              }}
            >
              Higher levels add live coaching and events.
            </h2>
            <p className="text-sm mx-auto" style={{ color: "#68707A", maxWidth: "480px" }}>
              For members who want direct access to Dr. Paul and certified Positives coaches —
              through live calls, quarterly events, and personal implementation support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                level: "Level 1",
                title: "Membership",
                items: [
                  "Monthly masterclass with Dr. Paul",
                  "Daily grounding audio",
                  "Weekly principles & practices",
                  "Full content library",
                  "Private podcast feed",
                  "Reflection prompts & journal",
                ],
                accent: "#2F6FED",
                active: true,
              },
              {
                level: "Level 2",
                title: "Membership + Events",
                items: [
                  "Everything in Level 1",
                  "Quarterly virtual events",
                  "Live Q&A with Dr. Paul",
                  "Event replays",
                  "Annual Positives event access",
                ],
                accent: "#4E8C78",
                active: false,
              },
              {
                level: "Level 3",
                title: "Coaching Circle",
                items: [
                  "Everything in Levels 1 & 2",
                  "Weekly group coaching sessions",
                  "Certified Positives coaches",
                  "Session replays",
                  "Implementation support",
                ],
                accent: "#D98A4E",
                active: false,
              },
            ].map(({ level, title, items, accent, active }) => (
              <div
                key={level}
                className="relative rounded-3xl p-7 flex flex-col"
                style={{
                  background: active ? "#FFFFFF" : "#F0EDE7",
                  border: active ? `1.5px solid ${accent}30` : "1px solid #DDD7CF",
                  boxShadow: active ? "0 8px 24px rgba(18,20,23,0.07)" : "none",
                  opacity: active ? 1 : 0.8,
                }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <span className="text-xs font-bold uppercase"
                      style={{ color: accent, letterSpacing: "0.10em" }}>
                      {level}
                    </span>
                    <p className="font-heading font-semibold mt-0.5"
                      style={{ fontSize: "0.95rem", color: "#121417", letterSpacing: "-0.02em" }}>
                      {title}
                    </p>
                  </div>
                  {!active && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(18,20,23,0.06)", color: "#68707A" }}>
                      Coming soon
                    </span>
                  )}
                </div>
                <ul className="space-y-2.5 flex-1">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5"
                        style={{ background: `${accent}18` }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                          stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className="text-xs"
                        style={{ color: item.startsWith("Everything") ? "#68707A" : "#121417", lineHeight: "1.6" }}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
                {active ? (
                  <Link href="/join"
                    className="mt-6 w-full py-3 rounded-full text-center text-sm font-semibold"
                    style={{
                      background: `linear-gradient(135deg, ${accent} 0%, #245DD0 100%)`,
                      color: "#FFFFFF",
                      letterSpacing: "-0.01em",
                    }}>
                    Join now — $49/month
                  </Link>
                ) : (
                  <div className="mt-6 w-full py-3 rounded-full text-center text-sm font-medium"
                    style={{ background: "rgba(18,20,23,0.06)", color: "#68707A" }}>
                    Notify me when available
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ RISK REVERSAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full px-8 py-20"
        style={{ background: "#FFFFFF", borderTop: "1px solid #DDD7CF" }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-7"
            style={{ background: "#F6F3EE", border: "1px solid #ECE7DF" }}
            aria-hidden="true"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2
            className="font-heading font-bold mb-5"
            style={{
              fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)",
              letterSpacing: "-0.04em",
              lineHeight: "1.1",
              color: "#121417",
            }}
          >
            Try Positives for 30 days.
          </h2>
          <div className="space-y-3 mb-7" style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.75" }}>
            <p>
              If the practice doesn&apos;t meaningfully improve your days, simply email
              us and we&apos;ll refund your membership.
            </p>
            <p>No hassle. No questions.</p>
          </div>
          <p className="font-semibold" style={{ color: "#121417" }}>
            We believe the practice will speak for itself.
          </p>
        </div>
      </section>

      {/* ━━ CLOSING CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full px-8 py-28 text-center"
        style={{ background: "#121417", overflow: "hidden", borderTop: "1px solid #1E2228" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% -10%, rgba(47,111,237,0.16) 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-xl mx-auto">
          <p className="text-xs font-semibold uppercase mb-5"
            style={{ color: "#4E8C78", letterSpacing: "0.14em" }}>
            Your first practice is waiting
          </p>
          <h2
            className="font-heading font-bold mb-5"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
              letterSpacing: "-0.045em",
              lineHeight: "1.06",
              color: "#FFFFFF",
            }}
          >
            A few minutes each day.{" "}
            <span style={{ color: "#4A5360" }}>A more positive life.</span>
          </h2>
          <p
            className="text-base mb-9"
            style={{ color: "#8A9199", lineHeight: "1.72" }}
          >
            Join Positives and get immediate access to every masterclass, all past daily
            audios, weekly principles, and the full content library.
          </p>

          <Link
            href="/join"
            className="inline-flex items-center justify-center font-semibold text-sm px-10 py-4 rounded-full"
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              color: "#FFFFFF",
              boxShadow: "0 8px 32px rgba(47,111,237,0.35)",
              letterSpacing: "-0.01em",
            }}
          >
            Start your practice →
          </Link>

          <p className="mt-5 text-xs" style={{ color: "#3A4148" }}>
            $49/month · Cancel anytime · No contracts
          </p>
        </div>
      </section>

      {/* ━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer
        className="w-full px-8 py-7"
        style={{ borderTop: "1px solid rgba(221,215,207,0.5)", background: "#F6F3EE" }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-5">
            <Logo height={20} href={null} className="opacity-50" />
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-xs" style={{ color: "#9AA0A8" }}>Privacy</Link>
              <Link href="/terms" className="text-xs" style={{ color: "#9AA0A8" }}>Terms</Link>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-xs" style={{ color: "#C4BDB5" }}>
              © {new Date().getFullYear()} Positives
            </span>
            <Link href="/login" className="text-xs font-medium" style={{ color: "#9AA0A8" }}>
              Member sign in
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
