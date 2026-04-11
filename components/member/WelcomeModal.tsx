"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * components/member/WelcomeModal.tsx
 *
 * First-login welcome sequence for new Positives members.
 *
 * Activation:
 *   - Reads `?welcome=1` from the URL (set by subscribe/success after
 *     the automatic sign-in redirect to /today)
 *   - Or, for members who still do not have a password, shows a once-per-session
 *     reminder modal on member pages other than /account
 *   - Strips `?welcome=1` from the URL immediately to keep the address bar clean
 *   - Dismisses via CTA or the × button
 *
 * This is a pure client component — the member layout does not need to change.
 * Include it once in (member)/layout.tsx (or MemberShellClient) and it will
 * silently no-op on every page except the initial post-signup /today?welcome=1.
 */

export function WelcomeModal({
  needsPasswordSetup = false,
  marketingOptedOut = false,
}: {
  needsPasswordSetup?: boolean;
  marketingOptedOut?: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [visible, setVisible] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [variant, setVariant] = useState<"welcome" | "password-reminder">("welcome");

  useEffect(() => {
    let cancelled = false;

    async function decideVisibility() {
      const welcomeParam = searchParams.get("welcome") === "1";
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const sessionKey = session?.refresh_token
        ? `positives-password-reminder:${session.refresh_token}`
        : "positives-password-reminder:fallback";

      if (welcomeParam) {
        if (needsPasswordSetup) {
          sessionStorage.setItem(sessionKey, "1");
        }
        if (!cancelled) {
          setVariant("welcome");
          setVisible(true);
        }

        // Strip ?welcome=1 from the URL cleanly — replace so it's not in history
        const params = new URLSearchParams(searchParams.toString());
        params.delete("welcome");
        const newUrl = params.size > 0 ? `${pathname}?${params}` : pathname;
        router.replace(newUrl, { scroll: false });
        return;
      }

      if (!needsPasswordSetup || pathname === "/account") {
        return;
      }

      if (sessionStorage.getItem(sessionKey) === "1") {
        return;
      }

      sessionStorage.setItem(sessionKey, "1");
      if (!cancelled) {
        setVariant("password-reminder");
        setVisible(true);
      }
    }

    void decideVisibility();

    return () => {
      cancelled = true;
    };
  }, [needsPasswordSetup, pathname, router, searchParams]);

  function dismiss() {
    setAnimatingOut(true);
    setTimeout(() => setVisible(false), 350);
  }

  if (!visible) return null;

  const isPasswordReminder = variant === "password-reminder";
  const heroEyebrow = isPasswordReminder ? "Secure your account" : "Membership Active";
  const heroTitlePrefix = isPasswordReminder ? "Create your" : "Welcome to";
  const heroTitleAccent = isPasswordReminder ? "password." : "Positives.";
  const heroBody = isPasswordReminder
    ? "You are already in. Adding a password now makes future sign-ins faster and keeps support friction low."
    : "Dr. Paul Jenkins is glad you're here. Your practice starts today.";
  const sectionLabel = isPasswordReminder ? "Why do this now" : "What's waiting for you";
  const reminderFeatures = isPasswordReminder
    ? [
        {
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#2F6FED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ),
          label: "Save a direct password sign-in",
          sub: "No inbox detour the next time you want to get in quickly",
          href: "/account",
        },
        {
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#4E8C78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          ),
          label: "Keep your account easier to recover",
          sub: "Password reset becomes much clearer than relying only on magic links",
          href: "/account",
        },
        {
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#B0956E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          ),
          label: "It takes less than a minute",
          sub: "You can still come back to your practice right after setting it",
          href: "/account",
        },
      ]
    : [
        {
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#2F6FED" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" />
            </svg>
          ),
          label: "Today's daily practice",
          sub: "A fresh mindset session is ready for you now",
          href: "/today",
        },
        {
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#4E8C78" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          ),
          label: "The full member library",
          sub: "Every past session, available at any time",
          href: "/library",
        },
        {
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#B0956E" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          ),
          label: "Your personal journal",
          sub: "Capture reflections alongside each practice",
          href: "/today",
        },
      ];

  return (
    <>
      <style>{`
        @keyframes positives-welcome-backdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes positives-welcome-card {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes positives-welcome-out-backdrop {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes positives-welcome-out-card {
          from { opacity: 1; transform: translateY(0)   scale(1); }
          to   { opacity: 0; transform: translateY(16px) scale(0.97); }
        }
        .welcome-backdrop {
          animation: ${animatingOut
            ? "positives-welcome-out-backdrop 0.35s ease both"
            : "positives-welcome-backdrop 0.4s ease both"};
        }
        .welcome-card {
          animation: ${animatingOut
            ? "positives-welcome-out-card 0.3s ease both"
            : "positives-welcome-card 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both"};
        }
        .welcome-feature-row {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
          padding: 0.875rem 0;
          border-bottom: 1px solid rgba(221,215,207,0.55);
        }
        .welcome-feature-row:last-child {
          border-bottom: none;
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        className="welcome-backdrop fixed inset-0 z-[9000] flex items-center justify-center px-5"
        style={{ background: "rgba(18,20,23,0.55)", backdropFilter: "blur(6px)" }}
        onClick={dismiss}
        aria-modal="true"
        role="dialog"
        aria-label={isPasswordReminder ? "Create your Positives password" : "Welcome to Positives"}
      >
        {/* ── Card ── */}
        <div
          className="welcome-card relative w-full"
          style={{
            maxWidth: "26rem",
            background: "#FAFAF8",
            borderRadius: "1.75rem",
            boxShadow: "0 32px 80px rgba(18,20,23,0.22), 0 2px 8px rgba(18,20,23,0.08)",
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Dismiss button */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close welcome message"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{ background: "rgba(18,20,23,0.06)", color: "#9AA0A8" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* ── Dark hero section ── */}
          <div
            className="relative overflow-hidden px-8 pt-10 pb-8 text-center"
            style={{ background: "#121417" }}
          >
            {/* Glow */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% -20%, rgba(47,111,237,0.22) 0%, transparent 65%)" }}
            />

            <div className="relative">
              {/* Green checkmark icon */}
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-5"
                style={{ background: "rgba(78,140,120,0.14)", border: "1.5px solid rgba(78,140,120,0.28)" }}
                aria-hidden="true"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#4E8C78" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <p
                className="text-xs font-semibold uppercase mb-3"
                style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
              >
                {heroEyebrow}
              </p>

              <h2
                className="font-heading font-bold"
                style={{
                  fontSize: "clamp(2rem, 6vw, 2.75rem)",
                  letterSpacing: "-0.05em",
                  lineHeight: "1.04",
                  color: "#FFFFFF",
                }}
              >
                {heroTitlePrefix}{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #6B9BF2 0%, #8FC4B5 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {heroTitleAccent}
                </span>
              </h2>

              <p
                className="mt-3 mx-auto text-sm"
                style={{ color: "#8A9199", lineHeight: "1.68", maxWidth: "18rem" }}
              >
                {heroBody}
              </p>
            </div>
          </div>

          {/* ── What's waiting section ── */}
          <div className="px-8 pt-6 pb-2">
            <p
              className="text-xs font-semibold uppercase mb-1"
              style={{ color: "#9AA0A8", letterSpacing: "0.12em" }}
            >
              {sectionLabel}
            </p>
          </div>

          <div className="px-8 pb-2">
            {reminderFeatures.map(({ icon, label, sub, href }) => (
              <div key={label} className="welcome-feature-row">
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-xl"
                  style={{ width: "2rem", height: "2rem", background: "rgba(18,20,23,0.05)" }}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#121417", letterSpacing: "-0.01em" }}>
                    <Link href={href} onClick={dismiss} style={{ color: "inherit", textDecoration: "none" }}>
                      {label}
                    </Link>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#9AA0A8", lineHeight: 1.55 }}>
                    {sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {!isPasswordReminder && marketingOptedOut ? (
            <div className="px-8 pb-2">
              <div
                className="rounded-3xl border px-5 py-4"
                style={{
                  borderColor: "rgba(176,149,110,0.18)",
                  background: "rgba(176,149,110,0.08)",
                }}
              >
                <p
                  className="text-[11px] font-semibold uppercase"
                  style={{ color: "#B0956E", letterSpacing: "0.14em" }}
                >
                  Email preference
                </p>
                <p className="mt-2 text-sm leading-body" style={{ color: "#6B635A" }}>
                  Optional practice emails are currently off for this account. You can turn them
                  back on anytime in{" "}
                  <Link
                    href="/account"
                    onClick={dismiss}
                    className="font-semibold underline underline-offset-4"
                    style={{ color: "#121417" }}
                  >
                    Account
                  </Link>
                  .
                </p>
              </div>
            </div>
          ) : null}

          {/* ── CTAs ── */}
          <div className="px-8 pt-5 pb-8 flex flex-col gap-3">
            {isPasswordReminder ? (
              <>
                <Link
                  href="/account"
                  onClick={dismiss}
                  className="w-full inline-flex items-center justify-center rounded-full font-semibold"
                  style={{
                    background: "#FFFFFF",
                    color: "#121417",
                    border: "1px solid rgba(18,20,23,0.10)",
                    letterSpacing: "-0.01em",
                    fontSize: "0.9375rem",
                    padding: "0.9rem 1.5rem",
                    textDecoration: "none",
                  }}
                >
                  Create my password
                </Link>

                <button
                  type="button"
                  onClick={dismiss}
                  className="w-full inline-flex items-center justify-center rounded-full font-semibold"
                  style={{
                    background: "#FFFFFF",
                    color: "#121417",
                    border: "1px solid rgba(18,20,23,0.10)",
                    letterSpacing: "-0.01em",
                    fontSize: "0.9375rem",
                    padding: "0.9rem 1.5rem",
                    textDecoration: "none",
                  }}
                >
                  Continue to my practice
                </button>

                <p className="text-center text-xs" style={{ color: "#8A9199", lineHeight: 1.65 }}>
                  We&apos;ll keep reminding you after sign-in until this is set up.
                </p>
              </>
            ) : (
              <>
                <Link
                  href="/today"
                  onClick={dismiss}
                  className="w-full inline-flex items-center justify-center font-semibold rounded-full"
                  style={{
                    background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                    color: "#FFFFFF",
                    boxShadow: "0 6px 24px rgba(47,111,237,0.30)",
                    letterSpacing: "-0.01em",
                    fontSize: "0.9375rem",
                    padding: "0.9rem 1.5rem",
                    textDecoration: "none",
                  }}
                >
                  Start my practice →
                </Link>

                {needsPasswordSetup ? (
                  <>
                    <Link
                      href="/account"
                      onClick={dismiss}
                      className="w-full inline-flex items-center justify-center rounded-full font-semibold"
                      style={{
                        background: "#FFFFFF",
                        color: "#121417",
                        border: "1px solid rgba(18,20,23,0.10)",
                        letterSpacing: "-0.01em",
                        fontSize: "0.9375rem",
                        padding: "0.9rem 1.5rem",
                        textDecoration: "none",
                      }}
                    >
                      Create my password
                    </Link>

                    <p className="text-center text-xs" style={{ color: "#8A9199", lineHeight: 1.65 }}>
                      You&apos;re already signed in. Adding a password now just makes your next
                      visit faster.
                    </p>
                  </>
                ) : (
                  <p className="text-center text-xs" style={{ color: "#B0A89E" }}>
                    Secure your account later in{" "}
                    <Link href="/account" onClick={dismiss} style={{ color: "#68707A" }}>
                      Settings
                    </Link>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
