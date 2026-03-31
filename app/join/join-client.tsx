"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  signUpAndJoin,
  signInAndJoin,
  startCheckoutAuthenticated,
  sendMagicLinkForJoin,
} from "./actions";
import Link from "next/link";

/**
 * app/join/join-client.tsx
 * Client component for the /join page.
 *
 * Props from the server page:
 *   isAuthenticated — user has a valid session
 *   userEmail       — email of the authenticated user (or null)
 *   initialError    — URL-param error to show on first render
 *
 * Auth modes (controlled by local state):
 *   "signup"      — email/password signup (default for unauthenticated)
 *   "signin"      — email/password sign-in for returning users
 *   "magic"       — magic link fallback
 */

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full px-6 py-3.5 rounded-full bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ boxShadow: "0 6px 24px rgba(18,20,23,0.05)" }}
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

const BENEFITS = [
  "Daily grounding audio from Dr. Paul",
  "Weekly principles and practices",
  "Monthly themes for reflection",
  "Full content library",
  "Private member podcast feed",
];

interface JoinClientProps {
  isAuthenticated: boolean;
  userEmail: string | null;
  initialError: string | null;
}

export function JoinClient({
  isAuthenticated,
  userEmail,
  initialError,
}: JoinClientProps) {
  const [mode, setMode] = useState<"signup" | "signin" | "magic">("signup");

  const [signUpState, signUpAction] = useActionState(signUpAndJoin, {
    error: initialError ?? undefined,
  });
  const [signInState, signInAction] = useActionState(signInAndJoin, {});
  const [checkoutState, checkoutAction] = useActionState(
    startCheckoutAuthenticated,
    {}
  );
  const [magicState, magicAction] = useActionState(sendMagicLinkForJoin, {});

  const errorMessage =
    signUpState?.error ||
    signInState?.error ||
    checkoutState?.error ||
    magicState?.error;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* ── Nav ────────────────────────────────────────────────────── */}
      <header className="px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-heading font-bold text-lg tracking-tight text-foreground"
        >
          Positives
        </Link>
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </Link>
      </header>

      {/* ── Main content ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-10 px-6 py-12 max-w-4xl mx-auto w-full">
        {/* ── Left: product summary ─────────────────────────────────── */}
        <div className="flex-1 pt-2">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5 tracking-wide uppercase">
            Level 1 — Membership
          </span>

          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-4 leading-tight tracking-tight">
            Start your daily practice
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed mb-8 max-w-sm">
            A short grounding practice every day, guided by Dr. Paul Jenkins.
            Calm, clarity, and resilience — built over time.
          </p>

          <ul className="space-y-3 mb-8">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="text-foreground text-sm leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          {/* Pricing */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-muted-foreground text-sm line-through">
              $97/month
            </span>
            <span className="font-heading font-bold text-3xl text-foreground">
              $49
            </span>
            <span className="text-muted-foreground text-sm">/month</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Cancel anytime · No contracts · Secure checkout via Stripe
          </p>
        </div>

        {/* ── Right: auth / checkout form ───────────────────────────── */}
        <div
          className="w-full lg:w-96 flex-shrink-0 bg-card border border-border rounded-2xl p-7"
          style={{ boxShadow: "0 12px 36px rgba(18,20,23,0.08)" }}
        >
          {/* ── CASE 1: Already authenticated, inactive ───────────── */}
          {isAuthenticated ? (
            <div>
              <h2 className="font-heading font-semibold text-lg text-foreground mb-1">
                Complete your membership
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Signed in as{" "}
                <span className="text-foreground font-medium">{userEmail}</span>
              </p>

              {errorMessage && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                  {errorMessage}
                </div>
              )}

              <form action={checkoutAction}>
                <SubmitButton label="Continue to checkout →" />
              </form>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Not you?{" "}
                <Link
                  href="/login"
                  className="text-primary hover:underline"
                >
                  Sign in with a different account
                </Link>
              </p>
            </div>
          ) : mode === "magic" ? (
            /* ── CASE 2: Magic link form ───────────────────────────── */
            <div>
              <button
                onClick={() => setMode("signup")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-5 flex items-center gap-1"
              >
                ← Back
              </button>
              <h2 className="font-heading font-semibold text-lg text-foreground mb-1">
                Sign in with a link
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                We&apos;ll email you a one-time sign-in link.
              </p>

              {magicState?.error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                  {magicState.error}
                </div>
              )}

              <form action={magicAction} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="magic-email"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="magic-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 transition"
                    style={{ "--tw-ring-color": "rgba(47,111,237,0.18)" } as React.CSSProperties}
                  />
                </div>
                <SubmitButton label="Send sign-in link" />
              </form>
            </div>
          ) : mode === "signin" ? (
            /* ── CASE 3: Sign-in form (returning user, inactive) ───── */
            <div>
              <button
                onClick={() => setMode("signup")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-5 flex items-center gap-1"
              >
                ← Back
              </button>
              <h2 className="font-heading font-semibold text-lg text-foreground mb-1">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Sign in to continue to checkout.
              </p>

              {signInState?.error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                  {signInState.error}
                </div>
              )}

              <form action={signInAction} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="signin-email"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="signin-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 transition"
                    style={{ "--tw-ring-color": "rgba(47,111,237,0.18)" } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label
                    htmlFor="signin-password"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="signin-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Your password"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 transition"
                    style={{ "--tw-ring-color": "rgba(47,111,237,0.18)" } as React.CSSProperties}
                  />
                </div>
                <SubmitButton label="Sign in and continue →" />
              </form>

              <div className="mt-4 text-center space-y-2">
                <button
                  onClick={() => setMode("magic")}
                  className="block w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot your password? Sign in with a link
                </button>
              </div>
            </div>
          ) : (
            /* ── CASE 4: New user signup (default) ──────────────────── */
            <div>
              <h2 className="font-heading font-semibold text-lg text-foreground mb-1">
                Create your account
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Start your Positives practice today.
              </p>

              {signUpState?.error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                  {signUpState.error}
                </div>
              )}

              <form action={signUpAction} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 transition"
                    style={{ "--tw-ring-color": "rgba(47,111,237,0.18)" } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    minLength={8}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 transition"
                    style={{ "--tw-ring-color": "rgba(47,111,237,0.18)" } as React.CSSProperties}
                  />
                </div>
                <SubmitButton label="Create account and continue →" />
              </form>

              <div className="mt-5 flex flex-col gap-2 text-center">
                <button
                  onClick={() => setMode("signin")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Already have an account? Sign in
                </button>
                <button
                  onClick={() => setMode("magic")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Prefer a sign-in link instead
                </button>
              </div>

              <p className="mt-5 text-center text-xs text-muted-foreground border-t border-border pt-4">
                Secure checkout via Stripe · Cancel anytime
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
