import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Positives — A Daily Practice for Emotional Resilience with Dr. Paul Jenkins",
  description:
    "Positives is a practice-based membership with Dr. Paul Jenkins — daily audio, weekly principles, monthly masterclasses, and coaching. Build the habit that changes how you feel every day.",
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
          background: "rgba(246,243,238,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(221,215,207,0.6)",
        }}
      >
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <span
            className="font-heading font-bold"
            style={{ fontSize: "1.2rem", color: "#121417", letterSpacing: "-0.04em" }}
          >
            Positives
          </span>
          <div className="flex items-center gap-5">
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
                background: "#121417",
                color: "#FFFFFF",
                letterSpacing: "-0.01em",
                boxShadow: "0 2px 12px rgba(18,20,23,0.22)",
              }}
            >
              Join today
            </Link>
          </div>
        </div>
      </header>

      {/* ━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full"
        style={{ overflow: "hidden", minHeight: "calc(100vh - 57px)" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 70% 20%, rgba(47,111,237,0.08) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(78,140,120,0.06) 0%, transparent 50%)",
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
                fontSize: "clamp(3rem, 5.5vw, 5.5rem)",
                lineHeight: "1.02",
                letterSpacing: "-0.045em",
                color: "#121417",
                textWrap: "balance",
              } as React.CSSProperties}
            >
              Build the daily habit
              <br />that makes you{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #2F6FED 20%, #4E8C78 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                genuinely more positive.
              </span>
            </h1>

            <p
              className="mb-9"
              style={{
                fontSize: "1.1rem",
                color: "#68707A",
                lineHeight: "1.7",
                maxWidth: "460px",
                letterSpacing: "-0.01em",
              }}
            >
              Every month, Dr. Paul Jenkins teaches a live masterclass on a different
              dimension of positivity. Your membership gives you the daily audios, weekly
              practices, and coaching support to make it stick — for good.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
              <Link
                href="/join"
                className="inline-flex items-center justify-center font-semibold px-8 py-4 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  color: "#FFFFFF",
                  boxShadow: "0 8px 28px rgba(47,111,237,0.32)",
                  letterSpacing: "-0.01em",
                  fontSize: "0.9rem",
                }}
              >
                Start your practice →
              </Link>
              <Link href="/login" className="text-sm font-medium" style={{ color: "#68707A" }}>
                Already a member?
              </Link>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-sm" style={{ color: "#68707A" }}>
                <span style={{ color: "#121417", fontWeight: 600 }}>$49/month</span>
                {" "}· Cancel anytime · Secure checkout via Stripe
              </p>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["#D98A4E", "#4E8C78", "#2F6FED", "#B94A3F", "#8A7B6E"].map((color, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2"
                      style={{ background: color, borderColor: "#F6F3EE" }}
                      aria-hidden="true" />
                  ))}
                </div>
                <p className="text-xs font-medium" style={{ color: "#68707A" }}>
                  Hundreds of members. A practice that sticks.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Product Preview Card */}
          <div className="hidden lg:flex flex-col justify-center items-center py-16" aria-hidden="true">
            <div className="relative w-full max-w-sm xl:max-w-md">
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: "radial-gradient(ellipse at 50% 60%, rgba(47,111,237,0.18) 0%, transparent 70%)",
                  transform: "scale(1.15) translateY(8%)",
                  filter: "blur(24px)",
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
                  <div className="flex items-center gap-0.5 h-8 mb-4">
                    {[3,5,8,6,9,12,14,10,8,11,13,9,7,11,14,12,9,6,8,10,7,5,9,11,8,6,4,7,9,6,4,3].map(
                      (h, i) => (
                        <div key={i} className="flex-1 rounded-full"
                          style={{
                            height: `${h * 2}px`,
                            background: i < 10 ? "rgba(47,111,237,0.85)" : "rgba(18,20,23,0.12)",
                          }} />
                      )
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium tabular-nums" style={{ color: "#2F6FED" }}>3:12</span>
                    <span className="text-xs" style={{ color: "#68707A" }}>8:00</span>
                  </div>
                  <div className="mt-2 w-full rounded-full overflow-hidden" style={{ height: "3px", background: "rgba(18,20,23,0.08)" }}>
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
                      <span style={{ fontSize: "0.9rem" }}>🎓</span>
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
                      <span style={{ fontSize: "0.9rem" }}>🌿</span>
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
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "1rem" }}>🔥</span>
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

      {/* ━━ TRUST BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full py-5"
        style={{
          borderTop: "1px solid #DDD7CF",
          borderBottom: "1px solid #DDD7CF",
          background: "#FFFFFF",
        }}
      >
        <div className="max-w-7xl mx-auto px-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {[
            { icon: "🎓", text: "Monthly masterclass with Dr. Paul" },
            { icon: "🎧", text: "Daily audio · every morning" },
            { icon: "📖", text: "Weekly principles & practices" },
            { icon: "🎙️", text: "Private podcast feed" },
            { icon: "📚", text: "Full content library" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <span style={{ fontSize: "0.85rem" }}>{icon}</span>
              <span className="text-xs font-medium" style={{ color: "#68707A", letterSpacing: "-0.01em" }}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ HOW YOUR PRACTICE WORKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative w-full px-8 py-24" style={{ background: "#F6F3EE" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-14 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase mb-3"
                style={{ color: "#68707A", letterSpacing: "0.14em" }}>
                How it works
              </p>
              <h2
                className="font-heading font-bold"
                style={{
                  fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                  letterSpacing: "-0.04em",
                  lineHeight: "1.1",
                  color: "#121417",
                  textWrap: "balance",
                } as React.CSSProperties}
              >
                A layered practice that builds{" "}
                <span style={{ color: "#4E8C78" }}>month by month.</span>
              </h2>
            </div>
            <Link href="/join" className="self-start lg:self-auto text-sm font-semibold"
              style={{ color: "#2F6FED", letterSpacing: "-0.01em" }}>
              See what's included →
            </Link>
          </div>

          {/* Three-layer rhythm */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {[
              {
                label: "Daily",
                number: "01",
                title: "Guided audio from Dr. Paul",
                body: "Every morning, a short audio message from Dr. Paul — 5 to 10 minutes of grounding, perspective, and practical tools that help you move through your day differently.",
                accent: "#2F6FED",
                bg: "rgba(47,111,237,0.04)",
                border: "rgba(47,111,237,0.12)",
              },
              {
                label: "Weekly",
                number: "02",
                title: "A principle with a practice",
                body: "Each week introduces one research-backed principle tied to the monthly masterclass. One clear idea. One specific practice to apply. Your weekly content deepens your daily habit.",
                accent: "#4E8C78",
                bg: "rgba(78,140,120,0.05)",
                border: "rgba(78,140,120,0.14)",
              },
              {
                label: "Monthly",
                number: "03",
                title: "A live masterclass with Dr. Paul",
                body: "Every month, Dr. Paul teaches a live masterclass on a specific dimension of positivity and emotional resilience — drawing from 30 years of psychology research and his Seven Key Relationships framework.",
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
                <p className="text-sm flex-1" style={{ color: "#68707A", lineHeight: "1.7" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>

          {/* The Seven Key Relationships callout */}
          <div
            className="rounded-3xl px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-5"
            style={{
              background: "linear-gradient(135deg, rgba(47,111,237,0.06) 0%, rgba(78,140,120,0.06) 100%)",
              border: "1px solid rgba(47,111,237,0.12)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
              style={{ background: "#FFFFFF", border: "1px solid #DDD7CF" }}
              aria-hidden="true"
            >
              🔑
            </div>
            <div>
              <p className="font-heading font-semibold mb-1"
                style={{ fontSize: "1rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Built on the Seven Key Relationships Framework
              </p>
              <p className="text-sm" style={{ color: "#68707A", lineHeight: "1.65", maxWidth: "560px" }}>
                Dr. Paul&apos;s research shows that life satisfaction is shaped by seven core relationships —
                with yourself, your partner, family, friends, your work, your community, and your spiritual life.
                Each monthly masterclass explores one, giving your practice a clear direction that evolves
                through the year.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━ DR. PAUL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full px-8 py-24"
        style={{ background: "#121417", overflow: "hidden" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 40%, rgba(47,111,237,0.10) 0%, transparent 55%), radial-gradient(ellipse at 15% 75%, rgba(78,140,120,0.07) 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-semibold uppercase mb-6"
              style={{ color: "#4E8C78", letterSpacing: "0.14em" }}>
              Your guide
            </p>
            <h2
              className="font-heading font-bold mb-5"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.25rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.08",
                color: "#FFFFFF",
                textWrap: "balance",
              } as React.CSSProperties}
            >
              30 years of research.{" "}
              <span style={{ color: "#4A5360" }}>One daily practice.</span>
            </h2>
            <p className="text-base mb-8"
              style={{ color: "#8A9199", lineHeight: "1.72", maxWidth: "420px" }}>
              Dr. Paul Jenkins is a licensed clinical psychologist, bestselling author, and
              sought-after speaker who has spent his career studying why some people become
              genuinely more positive — and exactly how to replicate that in anyone willing
              to practice. Positives is the result: a structured, daily membership that
              delivers his methodology in a form you can actually sustain.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {["Clinical Psychologist", "Bestselling Author", "Keynote Speaker", "30+ years research"].map((tag) => (
                <span key={tag} className="text-xs font-medium px-3.5 py-1.5 rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#7A8390",
                    letterSpacing: "-0.01em",
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
              style={{ top: "-6px", left: "28px", fontSize: "5rem", lineHeight: 1, color: "rgba(47,111,237,0.20)" }}
              aria-hidden="true"
            >
              &ldquo;
            </div>
            <p
              className="font-heading font-semibold relative z-10 mt-4"
              style={{
                fontSize: "1.2rem",
                lineHeight: "1.6",
                color: "#FFFFFF",
                letterSpacing: "-0.02em",
                textWrap: "balance",
              } as React.CSSProperties}
            >
              Positivity is a skill. It gets stronger with deliberate, consistent practice.
              Most people never train it intentionally. Positives exists so you can.
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
              style={{ color: "#68707A", letterSpacing: "0.14em" }}>
              Level 1 Membership
            </p>
            <h2
              className="font-heading font-bold mb-5"
              style={{
                fontSize: "clamp(2rem, 3.5vw, 3rem)",
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
                  whiteSpace: "nowrap",
                }}
              >
                on day one.
              </span>
            </h2>
            <p className="text-base"
              style={{ color: "#68707A", lineHeight: "1.72", maxWidth: "340px" }}>
              The moment you join, you have full access to everything — including
              every past masterclass, all past weekly principles, and the complete
              audio library going back to Day 1.
            </p>
            <div className="mt-7">
              <Link href="/join"
                className="inline-flex items-center justify-center font-semibold text-sm px-7 py-3.5 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  color: "#FFFFFF",
                  boxShadow: "0 6px 20px rgba(47,111,237,0.28)",
                  letterSpacing: "-0.01em",
                }}>
                Join Positives today →
              </Link>
            </div>
          </div>

          <ul className="space-y-4">
            {[
              {
                title: "Monthly masterclass with Dr. Paul",
                sub: "A live, in-depth teaching every month on one dimension of positivity — drawn from his Seven Key Relationships framework and 30 years of research. All past masterclasses included.",
                icon: "🎓",
              },
              {
                title: "Daily grounding audio — every morning",
                sub: "A fresh 5–10 minute message from Dr. Paul, every single day. Grounding, perspective, and a specific tool or technique to carry into your day. Hundreds in the library.",
                icon: "🎧",
              },
              {
                title: "Weekly principles & practices",
                sub: "One research-backed principle each week — tied to the monthly masterclass — with a specific practice attached. Your weekly work deepens your daily habit and compounds over time.",
                icon: "📖",
              },
              {
                title: "Complete content library",
                sub: "Every past masterclass, daily audio, weekly principle, workshop, and resource — searchable and available on demand. Pick up anything you missed or revisit what resonates.",
                icon: "📚",
              },
              {
                title: "Private podcast feed",
                sub: "Your daily audios and weekly content delivered straight to Apple Podcasts, Spotify, or any podcast app — so Positives fits naturally into your existing morning routine.",
                icon: "🎙️",
              },
              {
                title: "Reflection prompts & private journal",
                sub: "Guided reflection after each session. Write privately, track your thinking over time, and watch yourself grow — one entry at a time.",
                icon: "📓",
              },
            ].map(({ title, sub, icon }) => (
              <li key={title}
                className="flex items-start gap-4 p-5 rounded-2xl"
                style={{ background: "#F6F3EE", border: "1px solid #ECE7DF" }}>
                <span
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: "#FFFFFF", border: "1px solid #DDD7CF" }}
                  aria-hidden="true"
                >
                  {icon}
                </span>
                <div>
                  <p className="font-semibold text-sm mb-0.5"
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

      {/* ━━ HIGHER LEVELS CALLOUT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full px-8 py-16"
        style={{
          background: "#F6F3EE",
          borderTop: "1px solid #DDD7CF",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase mb-3"
              style={{ color: "#68707A", letterSpacing: "0.14em" }}>
              Want more?
            </p>
            <h2
              className="font-heading font-bold mb-3"
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.12",
                color: "#121417",
              }}
            >
              Higher levels add live coaching and events.
            </h2>
            <p className="text-sm" style={{ color: "#68707A", maxWidth: "480px", margin: "0 auto" }}>
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
                      <span className="text-xs" style={{ color: item.startsWith("Everything") ? "#68707A" : "#121417", lineHeight: "1.6" }}>
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

      {/* ━━ PULL QUOTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full px-8 py-20"
        style={{
          background: "linear-gradient(135deg, #F1EEE8 0%, #E8E2D8 100%)",
          borderTop: "1px solid #DDD7CF",
          borderBottom: "1px solid #DDD7CF",
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="font-heading font-bold mb-4"
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              letterSpacing: "-0.03em",
              lineHeight: "1.3",
              color: "#121417",
              textWrap: "balance",
            } as React.CSSProperties}
          >
            &ldquo;Positivity isn&apos;t a personality trait. It&apos;s a
            practice. The people who feel better aren&apos;t luckier —
            they&apos;ve trained themselves to think differently.&rdquo;
          </p>
          <p className="text-sm font-medium" style={{ color: "#68707A" }}>
            — Dr. Paul Jenkins, Ph.D.
          </p>
        </div>
      </section>

      {/* ━━ CLOSING CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full px-8 py-28 text-center"
        style={{ background: "#121417", overflow: "hidden" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% -10%, rgba(47,111,237,0.18) 0%, transparent 60%)",
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
              fontSize: "clamp(2rem, 4vw, 3rem)",
              letterSpacing: "-0.04em",
              lineHeight: "1.1",
              color: "#FFFFFF",
              textWrap: "balance",
            } as React.CSSProperties}
          >
            Start today.{" "}
            <span style={{ color: "#4A5360" }}>Come back tomorrow.</span>
          </h2>
          <p
            className="text-base mb-9"
            style={{
              color: "#8A9199",
              lineHeight: "1.72",
              textWrap: "balance",
            } as React.CSSProperties}
          >
            Join Positives and you get immediate access to every masterclass, all
            past daily audios, weekly principles, and the full content library.
            At{" "}
            <span style={{ color: "#FFFFFF", fontWeight: 600 }}>$49/month</span>,
            it&apos;s the most complete daily practice for emotional resilience
            available anywhere.
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
            Join Positives today →
          </Link>

          <p className="mt-5 text-xs" style={{ color: "#3A4148" }}>
            Secure checkout via Stripe · Cancel anytime · No contracts
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {[
              "Monthly masterclass + daily audio",
              "Weekly practices that compound",
              "30 years of psychology research",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2 text-xs font-medium"
                style={{ color: "#4A5360" }}>
                <span className="w-1 h-1 rounded-full" style={{ background: "#4E8C78" }} aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer
        className="w-full px-8 py-7"
        style={{ borderTop: "1px solid rgba(221,215,207,0.5)", background: "#F6F3EE" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: "#68707A" }}>
            © {new Date().getFullYear()} Positives
          </span>
          <Link href="/login" className="text-xs font-medium" style={{ color: "#68707A" }}>
            Member sign in
          </Link>
        </div>
      </footer>

    </div>
  );
}
