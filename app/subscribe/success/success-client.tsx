"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

/**
 * app/subscribe/success/success-client.tsx
 *
 * Client component responsible for the instant post-payment login flow.
 *
 * Flow:
 *   1. Mounts → starts polling /api/auth/exchange?session_id=...
 *   2. If { status: "pending" } → wait 1.5s → poll again
 *   3. If { status: "ready", token_hash } → call supabase.auth.verifyOtp()
 *   4. On success → show "You're in" state → router.push("/today") after 1.5s
 *   5. On timeout (30s) → show fallback state ("payment received, take a moment")
 *   6. On verifyOtp error → show same gentle fallback
 *
 * ─── State machine ───────────────────────────────────────────────────────────
 *
 *   "setting-up"  — polling in progress, webhook may still be processing
 *   "authing"     — token received, verifyOtp in flight
 *   "success"     — session established, about to redirect
 *   "fallback"    — timeout or verifyOtp failure; payment confirmed, manual login
 */

type Phase = "setting-up" | "authing" | "success" | "fallback";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 30_000;

interface SuccessClientProps {
  sessionId: string | null;
}

export function SuccessClient({ sessionId }: SuccessClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("setting-up");
  const [errorContext, setErrorContext] = useState<string | null>(null);

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
      setErrorContext(error.message);
      setPhase("fallback");
      return;
    }

    console.log("[Success] verifyOtp succeeded — session established.");
    setPhase("success");

    // Brief pause so the success state is visible before redirect
    setTimeout(() => {
      router.push("/today");
    }, 1600);
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
        console.error("[Success] Exchange endpoint error:", res.status, body?.error);
        // Don't immediately fall back — could be a transient error
        return;
      }

      const data = await res.json();

      if (data.status === "pending") {
        console.log("[Success] Token pending — continuing to poll…");
        return; // interval fires again in 1.5s
      }

      if (data.status === "ready" && data.token_hash) {
        completedRef.current = true;
        stopPolling();
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
    // Start polling
    pollExchange();

    pollIntervalRef.current = setInterval(pollExchange, POLL_INTERVAL_MS);

    // Absolute timeout — after 30s show fallback regardless
    timeoutRef.current = setTimeout(() => {
      if (completedRef.current) return;
      console.warn("[Success] 30s timeout — showing fallback state.");
      stopPolling();
      setPhase("fallback");
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

      {/* ── Phase: setting-up ─────────────────────────────────────── */}
      {(phase === "setting-up" || phase === "authing") && (
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
            {phase === "authing" ? "Signing you in…" : "Setting up your account"}
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

      {/* ── Phase: fallback ───────────────────────────────────────── */}
      {phase === "fallback" && (
        <div className="positives-animate-in text-center w-full max-w-xl mx-auto">
          {/* Gentle icon — clock / hourglass feel */}
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
            active. Setup is taking a moment longer than usual — sign in to
            access your practice right now.
          </p>

          <Link
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
            }}
          >
            Sign in to Positives →
          </Link>

          <p
            className="text-sm"
            style={{ color: "#B0A89E", lineHeight: "1.65", maxWidth: "360px", margin: "0 auto" }}
          >
            Use the email you provided at checkout. Check your inbox for a
            sign-in link if you haven&apos;t set a password yet.
          </p>
        </div>
      )}
    </>
  );
}
