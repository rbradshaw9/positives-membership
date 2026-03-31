"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

/**
 * app/login/login-client.tsx
 * Returning member sign-in — client component.
 *
 * Auth methods:
 *   "password" — email + password (primary)
 *   "magic"    — magic link via email (secondary)
 *
 * After successful sign-in, redirects to ?next param or /today.
 */

type Mode = "password" | "magic";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/today";
  const reason = searchParams.get("reason");

  const [mode, setMode] = useState<Mode>("password");
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handlePasswordSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;

    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setPending(false);

    if (signInError) {
      if (signInError.message.toLowerCase().includes("invalid login credentials")) {
        setError("Incorrect email or password. Try the email link option if you've forgotten your password.");
      } else {
        setError(signInError.message);
      }
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim();

    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setPending(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }
    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <div className="w-full max-w-sm mx-auto px-6 text-center">
        <div
          className="bg-card border border-border rounded-2xl p-8 mb-4"
          style={{ boxShadow: "0 6px 24px rgba(18,20,23,0.05)" }}
        >
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4 mx-auto">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <polyline points="22 7 12 13 2 7" />
            </svg>
          </span>
          <h1 className="font-heading font-bold text-xl text-foreground mb-2">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We sent a sign-in link. Click it to continue to your practice.
          </p>
        </div>
        <button
          onClick={() => setMagicSent(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto px-6">
      {/* Header */}
      <div className="mb-7 text-center">
        <Link
          href="/"
          className="block font-heading font-bold text-2xl tracking-tight mb-1 text-foreground"
        >
          Positives
        </Link>
        <p className="text-muted-foreground text-sm">
          {reason === "subscription_inactive"
            ? "Your membership is inactive. Sign in to manage your account."
            : "Welcome back. Sign in to continue your practice."}
        </p>
      </div>

      {/* Card */}
      <div
        className="bg-card border border-border rounded-2xl p-7"
        style={{ boxShadow: "0 12px 36px rgba(18,20,23,0.08)" }}
      >
        {/* Mode tabs */}
        <div className="flex rounded-xl border border-border overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => { setMode("password"); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              mode === "password"
                ? "bg-primary text-white"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setMode("magic"); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors border-l border-border ${
              mode === "magic"
                ? "bg-primary text-white"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Email link
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {mode === "password" ? (
          <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-foreground mb-1.5"
              >
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none transition"
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-foreground mb-1.5"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Your password"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full px-6 py-3.5 rounded-full bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors disabled:opacity-60"
              style={{ boxShadow: "0 6px 24px rgba(18,20,23,0.05)" }}
            >
              {pending ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
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
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full px-6 py-3.5 rounded-full bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors disabled:opacity-60"
              style={{ boxShadow: "0 6px 24px rgba(18,20,23,0.05)" }}
            >
              {pending ? "Sending…" : "Send sign-in link →"}
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Not a member yet?{" "}
        <Link href="/join" className="text-primary hover:underline">
          Join Positives
        </Link>
      </p>
    </div>
  );
}

export function LoginClient() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
