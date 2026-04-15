"use client";

import { createClient } from "@/lib/supabase/client";
import { formatSupabaseAuthError } from "@/lib/auth/client-error";
import { resolvePostLoginDestination } from "@/lib/auth/post-login-destination";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/marketing/Logo";

/**
 * app/login/login-client.tsx
 * Sprint 7: gradient background, CTA gradient button, minimal footer,
 * reassurance text, focus ring polish.
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
      setError(formatSupabaseAuthError(signInError.message));
      return;
    }

    const destination = await resolvePostLoginDestination(supabase, next);
    router.push(destination);
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
      setError(formatSupabaseAuthError(otpError.message));
      return;
    }
    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <div className="w-full max-w-sm mx-auto px-6 text-center">
        <div
          className="bg-card border border-border rounded-2xl p-8 mb-4"
          style={{ boxShadow: "0 12px 36px rgba(18,20,23,0.08)" }}
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

  const inputClassName = [
    "w-full px-4 py-3 rounded-xl border border-input bg-background",
    "text-foreground placeholder:text-muted-foreground text-sm",
    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60",
    "transition-colors",
  ].join(" ");

  return (
    <div className="w-full max-w-sm mx-auto px-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <Logo height={30} />
        </div>
        <p
          className="text-sm"
          style={{ color: "#68707A", lineHeight: "1.6" }}
        >
          {reason === "subscription_inactive"
            ? "Your membership is inactive. Sign in to manage your account."
            : "Welcome back to your practice."}
        </p>
      </div>

      {/* Card */}
      <div
        className="bg-card border border-border rounded-2xl p-7"
        style={{ boxShadow: "0 12px 36px rgba(18,20,23,0.08)" }}
      >
        {/* Mode tabs — segmented control */}
        <div
          className="flex rounded-xl overflow-hidden mb-6"
          style={{
            background: "#F6F3EE",
            border: "1px solid #DDD7CF",
            padding: "3px",
            gap: "3px",
          }}
        >
          <button
            type="button"
            onClick={() => { setMode("password"); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "password"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={{
              background: mode === "password" ? "#FFFFFF" : "transparent",
              boxShadow: mode === "password" ? "0 1px 4px rgba(18,20,23,0.08)" : "none",
              color: mode === "password" ? "#121417" : "#68707A",
              border: mode === "password" ? "1px solid #DDD7CF" : "1px solid transparent",
            }}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setMode("magic"); setError(null); }}
            className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
            style={{
              background: mode === "magic" ? "#FFFFFF" : "transparent",
              boxShadow: mode === "magic" ? "0 1px 4px rgba(18,20,23,0.08)" : "none",
              color: mode === "magic" ? "#121417" : "#68707A",
              border: mode === "magic" ? "1px solid #DDD7CF" : "1px solid transparent",
            }}
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
                className={inputClassName}
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
                className={inputClassName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.form?.requestSubmit();
                }}
              />
            </div>
            <div className="flex items-center justify-end -mt-1">
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full px-6 py-3.5 rounded-full text-white font-medium text-sm transition-all disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                boxShadow: "0 6px 24px rgba(47,111,237,0.25)",
                letterSpacing: "-0.01em",
              }}
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
                className={inputClassName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.form?.requestSubmit();
                }}
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full px-6 py-3.5 rounded-full text-white font-medium text-sm transition-all disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                boxShadow: "0 6px 24px rgba(47,111,237,0.25)",
                letterSpacing: "-0.01em",
              }}
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
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: "#F6F3EE" }}
    >
      {/* Subtle radial glow */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(47,111,237,0.05) 0%, transparent 65%)",
        }}
      />

      {/* ── Nav ── */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(246,243,238,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(221,215,207,0.6)",
        }}
      >
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <Logo height={26} />
          <Link
            href="/join"
            className="text-sm font-semibold px-5 py-2.5 rounded-full"
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              boxShadow: "0 4px 14px rgba(47,111,237,0.30)",
            }}
          >
            Join today
          </Link>
        </div>
      </header>

      {/* ── Form ── */}
      <div className="relative flex-1 flex flex-col items-center justify-center py-12">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>

      {/* ── Minimal footer ── */}
      <footer
        className="w-full py-6 text-center"
        style={{ borderTop: "1px solid rgba(221,215,207,0.5)" }}
      >
        <div className="flex items-center justify-center gap-4 text-xs" style={{ color: "#9AA0A8" }}>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <span aria-hidden="true">·</span>
          <span>© {new Date().getFullYear()} Positives</span>
        </div>
      </footer>
    </div>
  );
}
