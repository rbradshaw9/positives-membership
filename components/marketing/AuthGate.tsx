"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  signUpAndJoin,
  signInAndJoin,
  startCheckoutAuthenticated,
  sendMagicLinkForJoin,
} from "@/app/join/actions";
import Link from "next/link";

/**
 * components/marketing/AuthGate.tsx
 *
 * The auth + checkout form rendered below the pricing cards on /join.
 *
 * Auth modes:
 *   "signup"  — email/password signup (default for unauthenticated)
 *   "signin"  — email/password sign-in for returning users
 *   "magic"   — magic link fallback
 *
 * When isAuthenticated=true, skips all auth forms and shows one-click checkout.
 * priceId is passed as a hidden input so the selected plan flows through.
 */

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full px-6 py-3.5 rounded-full bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ boxShadow: "0 4px 16px rgba(18,20,23,0.10)" }}
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

interface AuthGateProps {
  isAuthenticated: boolean;
  userEmail: string | null;
  initialError: string | null;
  /** The Stripe price ID for the selected billing interval */
  priceId: string;
}

export function AuthGate({
  isAuthenticated,
  userEmail,
  initialError,
  priceId,
}: AuthGateProps) {
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
    <div
      className="bg-card border border-border rounded-2xl p-7"
      style={{ boxShadow: "0 8px 32px rgba(18,20,23,0.08)" }}
    >
      {/* ── CASE 1: Already authenticated, inactive ──────────────── */}
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
            <input type="hidden" name="priceId" value={priceId} />
            <SubmitButton label="Continue to checkout →" />
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Not you?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in with a different account
            </Link>
          </p>
        </div>

      ) : mode === "magic" ? (
        /* ── CASE 2: Magic link ────────────────────────────────────── */
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
            <input type="hidden" name="priceId" value={priceId} />
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
        /* ── CASE 3: Sign-in ───────────────────────────────────────── */
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
            <input type="hidden" name="priceId" value={priceId} />
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

          <div className="mt-4 text-center">
            <button
              onClick={() => setMode("magic")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot your password? Sign in with a link
            </button>
          </div>
        </div>

      ) : (
        /* ── CASE 4: New user signup (default) ─────────────────────── */
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
            <input type="hidden" name="priceId" value={priceId} />
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
  );
}
