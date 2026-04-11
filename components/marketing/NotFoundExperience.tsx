import Link from "next/link";
import { Logo } from "@/components/marketing/Logo";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";

export function NotFoundExperience() {
  const session = ANONYMOUS_PUBLIC_SESSION_STATE;
  const primaryHref = session.hasMemberAccess ? "/today" : "/join";

  return (
    <div
      className="min-h-dvh"
      style={{
        background:
          "radial-gradient(circle at 20% 0%, rgba(47,111,237,0.12) 0%, rgba(246,243,238,1) 44%), linear-gradient(180deg, #FAFAF8 0%, #F6F3EE 100%)",
      }}
    >
      <header
        className="w-full"
        style={{
          background: "rgba(250,250,248,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(221,215,207,0.55)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Logo kind="wordmark" height={24} />
          <Link href="/" className="text-sm font-medium" style={{ color: "#68707A" }}>
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-1 px-5 py-14 sm:px-8 lg:py-20">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-center">
          <section>
            <p
              className="text-xs font-semibold uppercase"
              style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
            >
              404 · page not found
            </p>
            <h1
              className="mt-5 font-heading text-5xl font-bold tracking-[-0.06em] text-foreground sm:text-6xl lg:text-7xl"
              style={{ lineHeight: "0.98", textWrap: "balance" }}
            >
              This page wandered off. Your practice did not.
            </h1>
            <p
              className="mt-6 max-w-2xl text-base sm:text-lg"
              style={{ color: "#68707A", lineHeight: "1.82", letterSpacing: "-0.01em" }}
            >
              Sometimes a link gets old, a path changes, or we simply end up somewhere unexpected.
              The good news is the reset is easy. Take the next calm step and we will get you back
              where you meant to be.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  color: "#FFFFFF",
                  boxShadow: "0 10px 30px rgba(47,111,237,0.24)",
                }}
              >
                {session.hasMemberAccess ? "Open today's practice →" : "Start your daily practice →"}
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border px-6 py-3.5 text-sm font-semibold"
                style={{
                  borderColor: "rgba(18,20,23,0.12)",
                  color: "#121417",
                  background: "#FFFFFF",
                }}
              >
                Return home
              </Link>
            </div>

            <p className="mt-5 text-sm" style={{ color: "#9AA0A8", lineHeight: "1.7" }}>
              If you were expecting member content, try the Today page. If you were exploring
              Positives for the first time, the homepage and join page will get you back on track.
            </p>
          </section>

          <aside
            className="rounded-[2rem] border p-6 sm:p-7"
            style={{
              background: "#10151D",
              borderColor: "rgba(18,20,23,0.08)",
              boxShadow: "0 24px 80px rgba(18,20,23,0.12)",
            }}
          >
            <div
              className="rounded-[1.75rem] border p-5 sm:p-6"
              style={{
                background:
                  "radial-gradient(circle at 20% 0%, rgba(47,111,237,0.16) 0%, rgba(16,21,29,0.98) 56%)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: "#7DB3F7", letterSpacing: "0.14em" }}
              >
                A calmer reset
              </p>
              <div className="mt-5 grid gap-4">
                {[
                  ["1", "Pause", "You do not need to force your way through a broken link."],
                  ["2", "Recenter", "Choose the path that matches what you came for."],
                  ["3", "Continue", "Get back to today, or start exploring Positives again."],
                ].map(([step, title, body]) => (
                  <div key={step} className="flex items-start gap-4">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "rgba(255,255,255,0.08)", color: "#FFFFFF" }}
                    >
                      <span className="text-sm font-semibold">{step}</span>
                    </div>
                    <div>
                      <h2
                        className="font-heading text-xl font-bold tracking-[-0.03em] text-white"
                        style={{ lineHeight: "1.1", textWrap: "balance" }}
                      >
                        {title}
                      </h2>
                      <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)", lineHeight: "1.75" }}>
                        {body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
