"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics/ga";

/**
 * app/subscribe/success/success-client.tsx
 *
 * Client component responsible for the instant post-payment login flow.
 *
 * Flow:
 *   1. Mounts → starts polling /api/auth/exchange?session_id=...
 *   2. If { status: "pending" } → wait 2s → poll again
 *   3. If { status: "ready", token_hash } → call supabase.auth.verifyOtp()
 *   4. On success → show "You're in" state → router.push("/today") after 1.5s
 *   5. On timeout (60s) → fetch email from session → auto-send magic link
 *   6. On verifyOtp error → same magic-link fallback
 *
 * ─── State machine ───────────────────────────────────────────────────────────
 *
 *   "setting-up"   — polling in progress, webhook may still be processing
 *   "authing"      — token received, verifyOtp in flight
 *   "success"      — session established, about to redirect
 *   "sending-link" — timeout/error, fetching email & sending magic link
 *   "link-sent"    — magic link dispatched, show inbox prompt
 *   "fallback"     — magic link send also failed, manual login prompt
 */

type Phase =
  | "setting-up"
  | "authing"
  | "success"
  | "sending-link"
  | "link-sent"
  | "fallback";

const POLL_INTERVAL_MS = 2000;
// 60 seconds — gives the webhook plenty of time even under load
const POLL_TIMEOUT_MS = 60_000;

/** Fire FP referral tracking if the SDK is loaded. Non-fatal. */
function fpReferral(email: string) {
  try {
    const w = window as unknown as { fpr?: (...a: unknown[]) => void };
    if (typeof w.fpr === "function") {
      w.fpr("referral", { email });
      console.log(`[FP] referral fired — ${email}`);
    }
  } catch {
    // Non-fatal — FP SDK may not be loaded yet in some edge cases
  }
}

interface SuccessClientProps {
  sessionId: string | null;
}

export function SuccessClient({ sessionId }: SuccessClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("setting-up");
  const [magicLinkEmail, setMagicLinkEmail] = useState<string | null>(null);

  // Stable refs so interval/timeout callbacks don't capture stale state
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  function stopPolling() {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollIntervalRef.current = null;
    timeoutRef.current = null;
  }

  async function exchangeToken(tokenHash: string) {
    setPhase("authing");
    console.log("[Success] Token received — calling verifyOtp…");

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (error) {
      console.error("[Success] verifyOtp failed:", error.message);
      // Don't just show fallback — try to send a magic link
      await sendMagicLink();
      return;
    }

    console.log("[Success] verifyOtp succeeded — session established.");
    setPhase("success");

    const eventKey = `positives:analytics:account-activated:${sessionId ?? "unknown"}`;
    if (!window.sessionStorage.getItem(eventKey)) {
      window.sessionStorage.setItem(eventKey, "1");
      track("sign_up", {
        method: "stripe_checkout",
        source_path: "/subscribe/success",
      });
      track("account_activated", {
        activation_method: "instant_login",
        source_path: "/subscribe/success",
        session_id: sessionId ?? undefined,
      });
    }

    setTimeout(() => {
      // ?welcome=1 triggers WelcomeModal on first landing — stripped by the modal after mount
      router.push("/today?welcome=1");
    }, 1600);
  }

  /**
   * Fetch the email from the Stripe session via the exchange endpoint
   * (it validates the session_id before returning anything), then
   * dispatch a magic link so the user can get in with one click.
   */
  async function sendMagicLink() {
    if (!sessionId) {
      setPhase("fallback");
      return;
    }

    setPhase("sending-link");
    console.log("[Success] Timeout/error — attempting to send magic link…");

    try {
      // The exchange endpoint validates the session and extracts the email.
      // We ping it (even if still "pending") just to get the email from Stripe.
      const res = await fetch(
        `/api/auth/exchange?session_id=${encodeURIComponent(sessionId)}`
      );
      const data = await res.json().catch(() => ({}));

      // The endpoint returns the email in all non-error paths
      // (it's embedded in the Stripe session). We add it to the response now.
      const email = data.email;

      if (!email) {
        console.warn("[Success] No email from exchange — falling back to manual.");
        setPhase("fallback");
        return;
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // User was already created by webhook
          emailRedirectTo: `${window.location.origin}/today`,
        },
      });

      if (otpError) {
        console.error("[Success] Magic link send failed:", otpError.message);
        setPhase("fallback");
        return;
      }

      setMagicLinkEmail(email);
      setPhase("link-sent");
      track("account_activation_link_sent", {
        source_path: "/subscribe/success",
        session_id: sessionId ?? undefined,
      });
      console.log(`[Success] Magic link sent to ${email}`);
    } catch (err) {
      console.error("[Success] sendMagicLink threw:", err);
      setPhase("fallback");
    }
  }

  async function pollExchange() {
    if (completedRef.current) return;

    if (!sessionId) {
      console.warn("[Success] No session_id — cannot poll.");
      setPhase("fallback");
      stopPolling();
      return;
    }

    try {
      console.log("[Success] Polling /api/auth/exchange…");
      const res = await fetch(
        `/api/auth/exchange?session_id=${encodeURIComponent(sessionId)}`
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(
          "[Success] Exchange endpoint error:",
          res.status,
          body?.error
        );
        // Don't immediately fall back — could be a transient error
        return;
      }

      const data = await res.json();

      if (data.status === "pending") {
        console.log("[Success] Token pending — continuing to poll…");
        return; // interval fires again in 2s
      }

      if (data.status === "ready" && data.token_hash) {
        completedRef.current = true;
        stopPolling();
        // Fire FP referral tracking as soon as we have the email confirmed
        if (data.email) fpReferral(data.email);
        await exchangeToken(data.token_hash);
        return;
      }

      console.warn("[Success] Unexpected exchange response:", data);
    } catch (err) {
      console.error("[Success] Poll fetch error:", err);
      // Network blip — keep polling until timeout
    }
  }

  useEffect(() => {
    // Start polling immediately
    pollExchange();

    pollIntervalRef.current = setInterval(pollExchange, POLL_INTERVAL_MS);

    // After 60 seconds: stop polling, auto-send magic link
    timeoutRef.current = setTimeout(() => {
      if (completedRef.current) return;
      console.warn("[Success] 60s timeout — sending magic link fallback.");
      stopPolling();
      sendMagicLink();
    }, POLL_TIMEOUT_MS);

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Shared layout wrapper ────────────────────────────────────────────────

  return (
    <>
      {/* Spinner keyframe — injected once */}
      <style>{`
        @keyframes positives-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes positives-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .positives-animate-in {
          animation: positives-fade-in 0.5s ease both;
        }
      `}</style>

      {/* ── Phase: setting-up / authing ────────────────────────────── */}
      {(phase === "setting-up" || phase === "authing" || phase === "sending-link") && (
        <div className="positives-animate-in text-center">
          {/* Spinning ring */}
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-10"
            style={{
              background: "rgba(47,111,237,0.07)",
              border: "1.5px solid rgba(47,111,237,0.18)",
            }}
            aria-hidden="true"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2F6FED"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              style={{ animation: "positives-spin 0.85s linear infinite" }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>

          <p
            className="text-xs font-semibold uppercase mb-5"
            style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
          >
            {phase === "authing"
              ? "Signing you in…"
              : phase === "sending-link"
              ? "Sending your access link…"
              : "Setting up your account"}
          </p>

          <h1
            className="font-heading font-bold mb-5"
            style={{
              fontSize: "clamp(3rem, 8vw, 5.5rem)",
              letterSpacing: "-0.055em",
              lineHeight: "1.0",
              color: "#121417",
            }}
          >
            Almost there.
          </h1>

          <p
            className="mx-auto"
            style={{
              fontSize: "clamp(1rem, 1.8vw, 1.1rem)",
              color: "#68707A",
              lineHeight: "1.72",
              maxWidth: "380px",
              letterSpacing: "-0.01em",
            }}
          >
            {phase === "authing"
              ? "Establishing your session — you'll be taken straight in."
              : phase === "sending-link"
              ? "Preparing your sign-in link — check your inbox in a moment."
              : "Payment confirmed. We're preparing your membership now."}
          </p>
        </div>
      )}

      {/* ── Phase: success ────────────────────────────────────────── */}
      {phase === "success" && (
        <div className="positives-animate-in text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-10"
            style={{
              background: "rgba(78,140,120,0.12)",
              border: "1.5px solid rgba(78,140,120,0.22)",
            }}
            aria-hidden="true"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4E8C78"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <p
            className="text-xs font-semibold uppercase mb-5"
            style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
          >
            Membership Active
          </p>

          <h1
            className="font-heading font-bold mb-5"
            style={{
              fontSize: "clamp(3.5rem, 9vw, 7rem)",
              letterSpacing: "-0.055em",
              lineHeight: "1.0",
              color: "#121417",
            }}
          >
            You&apos;re in.
          </h1>

          <p
            className="mx-auto"
            style={{
              fontSize: "clamp(1rem, 1.8vw, 1.15rem)",
              color: "#68707A",
              lineHeight: "1.72",
              maxWidth: "380px",
              letterSpacing: "-0.01em",
            }}
          >
            Taking you to your first practice now…
          </p>
        </div>
      )}

      {/* ── Phase: link-sent ──────────────────────────────────────── */}
      {phase === "link-sent" && (
        <div className="positives-animate-in text-center w-full max-w-xl mx-auto">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-10"
            style={{
              background: "rgba(47,111,237,0.08)",
              border: "1.5px solid rgba(47,111,237,0.20)",
            }}
            aria-hidden="true"
          >
            {/* Envelope icon */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2F6FED"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m2 7 10 7 10-7" />
            </svg>
          </div>

          <p
            className="text-xs font-semibold uppercase mb-5"
            style={{ color: "#2F6FED", letterSpacing: "0.14em" }}
          >
            Check Your Inbox
          </p>

          <h1
            className="font-heading font-bold mb-5"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              letterSpacing: "-0.05em",
              lineHeight: "1.04",
              color: "#121417",
            }}
          >
            Your membership
            <br />
            is active.
          </h1>

          <p
            className="mb-3 mx-auto"
            style={{
              fontSize: "clamp(1rem, 1.6vw, 1.05rem)",
              color: "#68707A",
              lineHeight: "1.72",
              maxWidth: "420px",
              letterSpacing: "-0.01em",
            }}
          >
            We&apos;ve sent a sign-in link to{" "}
            {magicLinkEmail ? (
              <strong style={{ color: "#121417" }}>{magicLinkEmail}</strong>
            ) : (
              "your email"
            )}
            . Click it to access your practice instantly — no password needed.
          </p>

          <p
            className="text-sm mt-8"
            style={{
              color: "#B0A89E",
              lineHeight: "1.65",
              maxWidth: "360px",
              margin: "2rem auto 0",
            }}
          >
            Don&apos;t see it? Check your spam folder, or{" "}
            <a
              href="/login"
              style={{ color: "#68707A", textDecoration: "underline" }}
            >
              sign in manually
            </a>
            .
          </p>
        </div>
      )}

      {/* ── Phase: fallback ───────────────────────────────────────── */}
      {phase === "fallback" && (
        <div className="positives-animate-in text-center w-full max-w-xl mx-auto">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-10"
            style={{
              background: "rgba(154,160,168,0.10)",
              border: "1.5px solid rgba(154,160,168,0.20)",
            }}
            aria-hidden="true"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9AA0A8"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <p
            className="text-xs font-semibold uppercase mb-5"
            style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
          >
            Payment Received
          </p>

          <h1
            className="font-heading font-bold mb-5"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              letterSpacing: "-0.05em",
              lineHeight: "1.04",
              color: "#121417",
            }}
          >
            Your membership
            <br />
            is active.
          </h1>

          <p
            className="mb-12 mx-auto"
            style={{
              fontSize: "clamp(1rem, 1.6vw, 1.05rem)",
              color: "#68707A",
              lineHeight: "1.72",
              maxWidth: "420px",
              letterSpacing: "-0.01em",
            }}
          >
            Your payment was received and your Positives membership is now
            active. Use the email you provided at checkout to sign in.
          </p>

          <a
            href="/login"
            id="success-fallback-login"
            className="inline-flex items-center justify-center font-semibold rounded-full mb-6"
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              color: "#FFFFFF",
              boxShadow: "0 8px 28px rgba(47,111,237,0.30)",
              letterSpacing: "-0.01em",
              fontSize: "1rem",
              padding: "1rem 2.5rem",
              textDecoration: "none",
            }}
          >
            Sign in to Positives →
          </a>

          <p
            className="text-sm"
            style={{
              color: "#B0A89E",
              lineHeight: "1.65",
              maxWidth: "360px",
              margin: "0 auto",
            }}
          >
            Use the email you provided at checkout. Check your inbox for a
            sign-in link if you haven&apos;t set a password yet.
          </p>
        </div>
      )}
    </>
  );
}
