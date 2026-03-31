import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Positives — A Daily Practice for Calm, Clarity & Resilience",
  description:
    "Positives is a practice-based membership guided by Dr. Paul Jenkins. A short daily habit that quietly changes how you feel over time. From $49/month.",
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO — Full-width two-column split
          Left: large left-aligned editorial headline + CTA
          Right: product UI preview card
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full"
        style={{ overflow: "hidden", minHeight: "calc(100vh - 57px)" }}
      >
        {/* Background gradient — subtle warmth */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 70% 20%, rgba(47,111,237,0.08) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(78,140,120,0.06) 0%, transparent 50%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-0 items-center min-h-[calc(100vh-57px)]">

          {/* ── LEFT: Editorial text ───────────────────────────────────────── */}
          <div className="py-20 lg:py-0 lg:pr-16 flex flex-col justify-center">

            {/* Eyebrow */}
            <div className="flex items-center gap-2.5 mb-8">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#4E8C78" }}
              />
              <span
                className="text-xs font-semibold uppercase"
                style={{ color: "#4E8C78", letterSpacing: "0.12em" }}
              >
                Founding member rate — now open
              </span>
            </div>

            {/* Main Headline — left-aligned, large, full column width */}
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
              A few minutes<br />
              each day.{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #2F6FED 20%, #4E8C78 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                A more<br className="hidden lg:block" /> positive life.
              </span>
            </h1>

            {/* Subhead */}
            <p
              className="mb-9"
              style={{
                fontSize: "1.1rem",
                color: "#68707A",
                lineHeight: "1.7",
                maxWidth: "440px",
                letterSpacing: "-0.01em",
              }}
            >
              A practice-based membership guided by Dr. Paul Jenkins — one
              simple daily habit that quietly changes how you move through
              the world.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
              <Link
                href="/join"
                className="inline-flex items-center justify-center font-semibold text-sm px-8 py-4 rounded-full"
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
              <Link
                href="/login"
                className="text-sm font-medium"
                style={{ color: "#68707A" }}
              >
                Already a member?
              </Link>
            </div>

            {/* Pricing anchor + social proof */}
            <div className="flex flex-col gap-4">
              <p className="text-sm" style={{ color: "#68707A" }}>
                <span style={{ color: "#121417", fontWeight: 600 }}>$49/month</span>
                {" "}· Founding member rate · Cancel anytime
              </p>

              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["#D98A4E", "#4E8C78", "#2F6FED", "#B94A3F", "#8A7B6E"].map(
                    (color, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full border-2"
                        style={{
                          background: color,
                          borderColor: "#F6F3EE",
                        }}
                        aria-hidden="true"
                      />
                    )
                  )}
                </div>
                <p className="text-xs font-medium" style={{ color: "#68707A" }}>
                  Members building a daily practice
                </p>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Product UI Preview ──────────────────────────────────── */}
          <div
            className="hidden lg:flex flex-col justify-center items-center py-16"
            aria-hidden="true"
          >
            {/* Outer glow container */}
            <div className="relative w-full max-w-sm xl:max-w-md">

              {/* Glow behind the card */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 60%, rgba(47,111,237,0.18) 0%, transparent 70%)",
                  transform: "scale(1.15) translateY(8%)",
                  filter: "blur(24px)",
                }}
              />

              {/* ── Daily practice card ───────────────────────────────────── */}
              <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #DDD7CF",
                  boxShadow:
                    "0 24px 64px rgba(18,20,23,0.10), 0 4px 16px rgba(18,20,23,0.06)",
                }}
              >
                {/* Card top bar */}
                <div
                  className="px-7 pt-7 pb-5"
                  style={{ borderBottom: "1px solid #F1EEE8" }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p
                        className="text-xs font-semibold uppercase mb-1"
                        style={{ color: "#4E8C78", letterSpacing: "0.12em" }}
                      >
                        Today
                      </p>
                      <p
                        className="font-heading font-bold"
                        style={{
                          fontSize: "1.1rem",
                          color: "#121417",
                          letterSpacing: "-0.03em",
                        }}
                      >
                        Morning Practice
                      </p>
                    </div>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: "#F6F3EE", border: "1px solid #DDD7CF" }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="#2F6FED"
                      >
                        <path d="M5 3l14 9-14 9V3z" />
                      </svg>
                    </div>
                  </div>

                  {/* Waveform — decorative */}
                  <div className="flex items-center gap-0.5 h-8 mb-4">
                    {[3,5,8,6,9,12,14,10,8,11,13,9,7,11,14,12,9,6,8,10,7,5,9,11,8,6,4,7,9,6,4,3].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-full"
                          style={{
                            height: `${h * 2}px`,
                            background:
                              i < 10
                                ? "rgba(47,111,237,0.85)"
                                : "rgba(18,20,23,0.12)",
                          }}
                        />
                      )
                    )}
                  </div>

                  {/* Progress */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-medium tabular-nums"
                      style={{ color: "#2F6FED" }}
                    >
                      3:12
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "#68707A" }}
                    >
                      8:00
                    </span>
                  </div>
                  <div
                    className="mt-2 w-full rounded-full overflow-hidden"
                    style={{
                      height: "3px",
                      background: "rgba(18,20,23,0.08)",
                    }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: "40%",
                        background: "#2F6FED",
                      }}
                    />
                  </div>
                </div>

                {/* Card middle — week + month context */}
                <div className="px-7 py-5" style={{ borderBottom: "1px solid #F1EEE8" }}>
                  <p
                    className="text-xs font-semibold uppercase mb-3"
                    style={{ color: "#68707A", letterSpacing: "0.10em" }}
                  >
                    This week
                  </p>
                  <div
                    className="flex items-center gap-3 p-4 rounded-2xl"
                    style={{ background: "#F6F3EE" }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(78,140,120,0.12)" }}
                    >
                      <span style={{ fontSize: "0.9rem" }}>🌿</span>
                    </div>
                    <div>
                      <p
                        className="text-xs font-semibold mb-0.5"
                        style={{ color: "#121417", letterSpacing: "-0.01em" }}
                      >
                        The practice of perspective
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "#68707A" }}
                      >
                        Week 4 of April
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card bottom — streak */}
                <div className="px-7 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "1rem" }}>🔥</span>
                      <div>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "#121417", letterSpacing: "-0.02em" }}
                        >
                          12-day streak
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "#68707A" }}
                        >
                          Keep going
                        </p>
                      </div>
                    </div>

                    {/* Day dots */}
                    <div className="flex gap-1.5">
                      {[true,true,true,true,true,false,false].map((done, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: done
                              ? "#4E8C78"
                              : "rgba(18,20,23,0.10)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating label below card */}
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
                <p
                  className="text-xs font-medium"
                  style={{ color: "#68707A" }}
                >
                  Your daily practice · every morning
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom fade into next section */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(246,243,238,0.5))",
          }}
        />
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
        <div className="max-w-7xl mx-auto px-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-3">
          {[
            { icon: "🎧", text: "Daily audio from Dr. Paul" },
            { icon: "📖", text: "Weekly principles & practices" },
            { icon: "🌙", text: "Monthly themes" },
            { icon: "🎙️", text: "Private podcast feed" },
            { icon: "📚", text: "Full content library" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <span style={{ fontSize: "0.85rem" }}>{icon}</span>
              <span
                className="text-xs font-medium"
                style={{ color: "#68707A", letterSpacing: "-0.01em" }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ DR. PAUL — EDITORIAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
          {/* Left */}
          <div>
            <p
              className="text-xs font-semibold uppercase mb-6"
              style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
            >
              Guided by
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
              Dr. Paul Jenkins.{" "}
              <span style={{ color: "#4A5360" }}>
                30 years. One practice.
              </span>
            </h2>
            <p
              className="text-base mb-8"
              style={{ color: "#8A9199", lineHeight: "1.72", maxWidth: "420px" }}
            >
              Dr. Paul is a psychologist, author, and speaker who has spent over
              30 years researching the science of positivity — not as an
              attitude, but as a cultivated skill. Positives is his daily
              methodology, made accessible to anyone willing to show up.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {["Psychologist", "Author", "Speaker", "30+ years"].map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium px-3.5 py-1.5 rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#7A8390",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right — pull quote */}
          <div
            className="relative p-9 rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.065)",
            }}
          >
            <div
              className="absolute font-heading font-bold select-none"
              style={{
                top: "-6px",
                left: "28px",
                fontSize: "5rem",
                lineHeight: 1,
                color: "rgba(47,111,237,0.20)",
              }}
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
              Positivity is not something that happens to you. It&apos;s a
              skill you practice — one day at a time. This is how we build it.
            </p>
            <p className="mt-6 text-sm font-medium" style={{ color: "#4A5360" }}>
              — Dr. Paul Jenkins
            </p>
          </div>
        </div>
      </section>

      {/* ━━ THE PRACTICE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative w-full px-8 py-24" style={{ background: "#F6F3EE" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-14 gap-4">
            <div>
              <p
                className="text-xs font-semibold uppercase mb-3"
                style={{ color: "#68707A", letterSpacing: "0.14em" }}
              >
                The practice
              </p>
              <h2
                className="font-heading font-bold"
                style={{
                  fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                  letterSpacing: "-0.04em",
                  lineHeight: "1.1",
                  color: "#121417",
                }}
              >
                Simple. Consistent.{" "}
                <span style={{ color: "#4E8C78" }}>Sustainable.</span>
              </h2>
            </div>
            <Link
              href="/join"
              className="self-start lg:self-auto text-sm font-semibold"
              style={{ color: "#2F6FED", letterSpacing: "-0.01em" }}
            >
              See all membership includes →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                label: "Daily",
                number: "01",
                title: "A short grounding audio",
                body: "A moment to reset before the day takes over. Short, direct, and personal — with Dr. Paul.",
                accent: "#2F6FED",
                bg: "rgba(47,111,237,0.04)",
                border: "rgba(47,111,237,0.12)",
              },
              {
                label: "Weekly",
                number: "02",
                title: "A principle and practice",
                body: "One idea to carry through your week. One thing to try. No homework. No pressure.",
                accent: "#4E8C78",
                bg: "rgba(78,140,120,0.05)",
                border: "rgba(78,140,120,0.14)",
              },
              {
                label: "Monthly",
                number: "03",
                title: "A theme for reflection",
                body: "A direction for the month ahead — not a curriculum, not a course. A place to return to.",
                accent: "#D98A4E",
                bg: "rgba(217,138,78,0.05)",
                border: "rgba(217,138,78,0.14)",
              },
            ].map(({ label, number, title, body, accent, bg, border }) => (
              <div
                key={label}
                className="relative rounded-3xl p-8 flex flex-col overflow-hidden"
                style={{
                  background: bg,
                  border: `1px solid ${border}`,
                }}
              >
                <span
                  className="absolute top-4 right-5 font-heading font-bold select-none pointer-events-none"
                  style={{
                    fontSize: "4.5rem",
                    lineHeight: 1,
                    color: accent,
                    opacity: 0.07,
                  }}
                  aria-hidden="true"
                >
                  {number}
                </span>
                <span
                  className="inline-block text-xs font-bold uppercase mb-5 px-3 py-1 rounded-full w-fit"
                  style={{
                    color: accent,
                    background: `${accent}14`,
                    letterSpacing: "0.10em",
                  }}
                >
                  {label}
                </span>
                <h3
                  className="font-heading font-semibold mb-3"
                  style={{
                    fontSize: "1.075rem",
                    letterSpacing: "-0.02em",
                    color: "#121417",
                    lineHeight: "1.35",
                  }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm flex-1"
                  style={{ color: "#68707A", lineHeight: "1.7" }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ BENEFITS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full px-8 py-24"
        style={{ background: "#FFFFFF", borderTop: "1px solid #DDD7CF" }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="lg:sticky lg:top-28">
            <p
              className="text-xs font-semibold uppercase mb-5"
              style={{ color: "#68707A", letterSpacing: "0.14em" }}
            >
              Membership includes
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
              Everything you{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #4E8C78 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  whiteSpace: "nowrap",
                }}
              >
                need.
              </span>
            </h2>
            <p
              className="text-base"
              style={{ color: "#68707A", lineHeight: "1.72", maxWidth: "340px" }}
            >
              No courses. No modules. No feeling behind. Just a daily practice
              that meets you where you are.
            </p>
          </div>

          <ul className="space-y-4">
            {[
              { title: "Daily grounding audio", sub: "From Dr. Paul — 5–10 minutes, every morning.", icon: "🎧" },
              { title: "Weekly principles & practices", sub: "One idea, one action. Simple and sustainable.", icon: "📖" },
              { title: "Monthly themes for reflection", sub: "A direction for the month, not a deadline.", icon: "🌙" },
              { title: "Full content library", sub: "Every past audio and principle, on demand.", icon: "📚" },
              { title: "Private member podcast feed", sub: "The daily practice in your favorite podcast app.", icon: "🎙️" },
            ].map(({ title, sub, icon }) => (
              <li
                key={title}
                className="flex items-start gap-4 p-5 rounded-2xl"
                style={{ background: "#F6F3EE", border: "1px solid #ECE7DF" }}
              >
                <span
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: "#FFFFFF", border: "1px solid #DDD7CF" }}
                  aria-hidden="true"
                >
                  {icon}
                </span>
                <div>
                  <p
                    className="font-semibold text-sm mb-0.5"
                    style={{ color: "#121417", letterSpacing: "-0.01em" }}
                  >
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
            &ldquo;It&apos;s not about being happy all the time. It&apos;s about
            knowing how to return to yourself when you&apos;re not.&rdquo;
          </p>
          <p className="text-sm font-medium" style={{ color: "#68707A" }}>
            — The Positives Method
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
          <p
            className="text-xs font-semibold uppercase mb-5"
            style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
          >
            Start your practice
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
            Founding members join at{" "}
            <span style={{ color: "#FFFFFF", fontWeight: 600 }}>$49/month</span>{" "}
            — the lowest price this membership will ever be. Annual billing
            available. Cancel anytime.
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
            Secure checkout via Stripe · No contract · Cancel anytime
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {[
              "30 years of research",
              "Practice-based, not course-based",
              "5 minutes a day",
            ].map((item) => (
              <span
                key={item}
                className="flex items-center gap-2 text-xs font-medium"
                style={{ color: "#4A5360" }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: "#4E8C78" }}
                  aria-hidden="true"
                />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer
        className="w-full px-8 py-7"
        style={{
          borderTop: "1px solid rgba(221,215,207,0.5)",
          background: "#F6F3EE",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: "#68707A" }}>
            © {new Date().getFullYear()} Positives
          </span>
          <Link
            href="/login"
            className="text-xs font-medium"
            style={{ color: "#68707A" }}
          >
            Member sign in
          </Link>
        </div>
      </footer>

    </div>
  );
}
