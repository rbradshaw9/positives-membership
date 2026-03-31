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
    <div className="min-h-dvh bg-background flex flex-col overflow-x-hidden">

      {/* ━━ NAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(246,243,238,0.82)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(221,215,207,0.5)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span
            className="font-heading font-bold text-xl tracking-tight"
            style={{ color: "#121417", letterSpacing: "-0.04em" }}
          >
            Positives
          </span>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-medium transition-colors"
              style={{ color: "#68707A" }}
            >
              Sign in
            </Link>
            <Link
              href="/join"
              className="text-sm font-medium px-5 py-2 rounded-full transition-all"
              style={{
                background: "#121417",
                color: "#FFFFFF",
                letterSpacing: "-0.01em",
              }}
            >
              Join today
            </Link>
          </div>
        </div>
      </header>

      {/* ━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full flex flex-col items-center justify-center text-center px-6 pt-28 pb-36"
        style={{ overflow: "hidden" }}
      >
        {/* Ambient orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            top: "-120px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "900px",
            height: "600px",
            background:
              "radial-gradient(ellipse at 50% 30%, rgba(47,111,237,0.13) 0%, rgba(217,138,78,0.07) 45%, transparent 70%)",
            filter: "blur(1px)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            bottom: 0,
            left: "10%",
            width: "500px",
            height: "400px",
            background:
              "radial-gradient(ellipse, rgba(78,140,120,0.10) 0%, transparent 70%)",
          }}
        />

        {/* Pill badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-10"
          style={{
            background: "rgba(47,111,237,0.08)",
            border: "1px solid rgba(47,111,237,0.18)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#2F6FED" }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#2F6FED", letterSpacing: "0.12em" }}
          >
            Now enrolling founding members
          </span>
        </div>

        <h1
          className="font-heading font-bold max-w-3xl mx-auto mb-7"
          style={{
            fontSize: "clamp(2.6rem, 6vw, 4.5rem)",
            lineHeight: "1.05",
            letterSpacing: "-0.04em",
            color: "#121417",
          }}
        >
          A few minutes each day.{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #4E8C78 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            A more positive life.
          </span>
        </h1>

        <p
          className="max-w-lg mx-auto mb-10 text-lg leading-relaxed"
          style={{ color: "#68707A", letterSpacing: "-0.01em" }}
        >
          A practice-based membership guided by Dr. Paul Jenkins — built around
          one simple daily habit that quietly changes everything.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <Link
            href="/join"
            className="inline-flex items-center justify-center font-semibold text-sm px-8 py-4 rounded-full transition-all"
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              color: "#FFFFFF",
              boxShadow: "0 8px 32px rgba(47,111,237,0.30)",
              letterSpacing: "-0.01em",
            }}
          >
            Start your practice →
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium transition-colors"
            style={{ color: "#68707A" }}
          >
            Already a member? Sign in
          </Link>
        </div>

        <p className="text-xs" style={{ color: "#68707A" }}>
          From{" "}
          <span className="font-semibold" style={{ color: "#121417" }}>
            $49/month
          </span>
          {" · "}Founding member rate · Cancel anytime
        </p>

        {/* Floating social proof strip */}
        <div
          className="mt-16 inline-flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{
            background: "#FFFFFF",
            border: "1px solid #DDD7CF",
            boxShadow: "0 4px 20px rgba(18,20,23,0.06)",
          }}
        >
          <div className="flex -space-x-2">
            {["#D98A4E", "#4E8C78", "#2F6FED", "#B94A3F"].map((color, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center"
                style={{ background: color }}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="text-xs font-medium" style={{ color: "#121417" }}>
            Join members building a daily practice
          </p>
        </div>
      </section>

      {/* ━━ DR. PAUL — EDITORIAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full px-6 py-28"
        style={{ background: "#121417", overflow: "hidden" }}
      >
        {/* Dark background texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 50%, rgba(47,111,237,0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(78,140,120,0.08) 0%, transparent 50%)",
          }}
        />

        <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
            >
              Guided by
            </p>
            <h2
              className="font-heading font-bold mb-6"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.25rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.08",
                color: "#FFFFFF",
              }}
            >
              Dr. Paul Jenkins.{" "}
              <span style={{ color: "#68707A" }}>30 years. One practice.</span>
            </h2>
            <p
              className="text-base leading-relaxed mb-8 max-w-md"
              style={{ color: "#A1A9B3", lineHeight: "1.7" }}
            >
              Dr. Paul is a psychologist, author, and speaker who has spent over
              30 years researching the science of positivity — not as an
              attitude, but as a cultivated skill. Positives is his daily
              methodology, distilled into a practice anyone can build.
            </p>

            <div className="flex flex-wrap gap-3">
              {["Psychologist", "Author", "Speaker", "30+ years research"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium px-3.5 py-1.5 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "#A1A9B3",
                    }}
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Right — pull quote */}
          <div
            className="relative p-10 rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              className="absolute -top-4 -left-2 font-heading font-bold select-none"
              style={{
                fontSize: "6rem",
                lineHeight: 1,
                color: "rgba(47,111,237,0.25)",
              }}
              aria-hidden="true"
            >
              &ldquo;
            </div>
            <p
              className="font-heading font-semibold leading-relaxed relative z-10"
              style={{
                fontSize: "1.25rem",
                lineHeight: "1.55",
                color: "#FFFFFF",
                letterSpacing: "-0.02em",
              }}
            >
              Positivity is not something that happens to you. It&apos;s a
              skill you practice, one day at a time. This is how we build it.
            </p>
            <p
              className="mt-5 text-sm font-medium"
              style={{ color: "#68707A" }}
            >
              — Dr. Paul Jenkins
            </p>
          </div>
        </div>
      </section>

      {/* ━━ THE PRACTICE — VISUAL RHYTHM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative w-full px-6 py-28" style={{ background: "#F6F3EE" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: "#68707A", letterSpacing: "0.14em" }}
            >
              The practice
            </p>
            <h2
              className="font-heading font-bold"
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.1",
                color: "#121417",
              }}
            >
              Simple. Consistent.{" "}
              <span style={{ color: "#4E8C78" }}>Sustainable.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                label: "Daily",
                number: "01",
                title: "A short grounding audio",
                body: "A moment to reset before the day pulls you away. Short, direct, and personal — with Dr. Paul.",
                accent: "#2F6FED",
                bg: "rgba(47,111,237,0.04)",
                border: "rgba(47,111,237,0.14)",
              },
              {
                label: "Weekly",
                number: "02",
                title: "A principle and practice",
                body: "One idea to carry through your week. One thing to try. No homework. No pressure. Just a direction.",
                accent: "#4E8C78",
                bg: "rgba(78,140,120,0.04)",
                border: "rgba(78,140,120,0.14)",
              },
              {
                label: "Monthly",
                number: "03",
                title: "A theme for reflection",
                body: "A lens for the month ahead — not a curriculum, not a course. A place to keep coming back to.",
                accent: "#D98A4E",
                bg: "rgba(217,138,78,0.04)",
                border: "rgba(217,138,78,0.14)",
              },
            ].map(({ label, number, title, body, accent, bg, border }) => (
              <div
                key={label}
                className="relative rounded-3xl p-8 flex flex-col overflow-hidden"
                style={{
                  background: bg,
                  border: `1px solid ${border}`,
                  boxShadow: "0 2px 16px rgba(18,20,23,0.04)",
                }}
              >
                {/* Large faded number */}
                <span
                  className="absolute top-4 right-6 font-heading font-bold select-none pointer-events-none"
                  style={{
                    fontSize: "5rem",
                    lineHeight: 1,
                    color: accent,
                    opacity: 0.08,
                  }}
                  aria-hidden="true"
                >
                  {number}
                </span>

                <span
                  className="inline-block text-xs font-bold uppercase tracking-widest mb-5 px-3 py-1 rounded-full w-fit"
                  style={{
                    color: accent,
                    background: `${accent}15`,
                    letterSpacing: "0.12em",
                  }}
                >
                  {label}
                </span>
                <h3
                  className="font-heading font-semibold mb-3"
                  style={{
                    fontSize: "1.15rem",
                    letterSpacing: "-0.02em",
                    color: "#121417",
                    lineHeight: "1.3",
                  }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm leading-relaxed flex-1"
                  style={{ color: "#68707A", lineHeight: "1.7" }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ BENEFITS — FULL-WIDTH STATEMENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full px-6 py-28"
        style={{ background: "#FFFFFF", borderTop: "1px solid #DDD7CF" }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
          {/* Left */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-5"
              style={{ color: "#68707A", letterSpacing: "0.14em" }}
            >
              Membership includes
            </p>
            <h2
              className="font-heading font-bold mb-6"
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.08",
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
                }}
              >
                need.
              </span>
            </h2>
            <p
              className="text-base leading-relaxed max-w-sm"
              style={{ color: "#68707A", lineHeight: "1.7" }}
            >
              No courses. No modules. No feeling behind. Just a daily practice
              that meets you where you are, every single day.
            </p>
          </div>

          {/* Right — feature list */}
          <ul className="space-y-5">
            {[
              {
                title: "Daily grounding audio",
                sub: "From Dr. Paul — 5–10 minutes, every morning.",
                icon: "🎧",
              },
              {
                title: "Weekly principles & practices",
                sub: "One idea, one action. Simple and sustainable.",
                icon: "📖",
              },
              {
                title: "Monthly themes for reflection",
                sub: "A direction for the month, not a deadline.",
                icon: "🌙",
              },
              {
                title: "Full content library",
                sub: "Every past audio and principle, on demand.",
                icon: "📚",
              },
              {
                title: "Private member podcast feed",
                sub: "The daily in your favorite podcast app.",
                icon: "🎙️",
              },
            ].map(({ title, sub, icon }) => (
              <li
                key={title}
                className="flex items-start gap-5 p-5 rounded-2xl transition-all"
                style={{
                  background: "#F6F3EE",
                  border: "1px solid #ECE7DF",
                }}
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

      {/* ━━ PULL QUOTE BREAKOUT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full px-6 py-24"
        style={{
          background: "linear-gradient(135deg, #F1EEE8 0%, #EAE4DC 100%)",
          borderTop: "1px solid #DDD7CF",
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="font-heading font-bold mb-6"
            style={{
              fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
              letterSpacing: "-0.03em",
              lineHeight: "1.25",
              color: "#121417",
            }}
          >
            &ldquo;It&apos;s not about being happy all the time. It&apos;s
            about knowing how to return to yourself when you&apos;re not.&rdquo;
          </p>
          <p className="text-sm font-medium" style={{ color: "#68707A" }}>
            — The Positives Method
          </p>
        </div>
      </section>

      {/* ━━ CLOSING CTA — DARK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full px-6 py-32 text-center"
        style={{ background: "#121417", overflow: "hidden" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(47,111,237,0.18) 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-xl mx-auto">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
          >
            Start your practice
          </p>
          <h2
            className="font-heading font-bold mb-5"
            style={{
              fontSize: "clamp(2rem, 4vw, 3.25rem)",
              letterSpacing: "-0.04em",
              lineHeight: "1.08",
              color: "#FFFFFF",
            }}
          >
            Start today.{" "}
            <span style={{ color: "#68707A" }}>Come back tomorrow.</span>
          </h2>
          <p
            className="text-base leading-relaxed mb-10"
            style={{ color: "#A1A9B3", lineHeight: "1.7" }}
          >
            Founding members join at{" "}
            <span className="text-white font-semibold">$49/month</span> — the
            lowest price this membership will ever be. Annual billing available.
            Cancel anytime, no questions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/join"
              className="inline-flex items-center justify-center font-semibold text-sm px-10 py-4 rounded-full transition-all"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 8px 32px rgba(47,111,237,0.35)",
                letterSpacing: "-0.01em",
              }}
            >
              Join Positives today →
            </Link>
          </div>

          <p className="mt-6 text-xs" style={{ color: "#4A5058" }}>
            Secure checkout via Stripe · No contract · Cancel anytime
          </p>

          {/* Trust row */}
          <div
            className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          >
            {[
              "30 years of research",
              "Practice-based, not course-based",
              "5 minutes a day",
            ].map((item) => (
              <span
                key={item}
                className="flex items-center gap-2 text-xs font-medium"
                style={{ color: "#6B7280" }}
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
        className="w-full px-6 py-8 flex items-center justify-between max-w-6xl mx-auto"
        style={{ borderTop: "1px solid rgba(221,215,207,0.4)" }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: "#68707A" }}
        >
          © {new Date().getFullYear()} Positives
        </span>
        <Link
          href="/login"
          className="text-xs font-medium transition-colors"
          style={{ color: "#68707A" }}
        >
          Member sign in
        </Link>
      </footer>

    </div>
  );
}
