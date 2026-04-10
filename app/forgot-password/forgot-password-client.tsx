"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseAuthError } from "@/lib/auth/client-error";
import { Logo } from "@/components/marketing/Logo";

export function ForgotPasswordClient() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string | null)?.trim().toLowerCase();

    if (!email) {
      setError("Enter the email you use for Positives.");
      return;
    }

    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });

    setPending(false);

    if (resetError) {
      setError(formatSupabaseAuthError(resetError.message));
      return;
    }

    setSentTo(email);
  }

  const inputClassName = [
    "w-full px-4 py-3 rounded-xl border border-input bg-background",
    "text-foreground placeholder:text-muted-foreground text-sm",
    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60",
    "transition-colors",
  ].join(" ");

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#F6F3EE" }}>
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(47,111,237,0.05) 0%, transparent 65%)",
        }}
      />

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
            href="/login"
            className="text-sm font-semibold px-5 py-2.5 rounded-full"
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              boxShadow: "0 4px 14px rgba(47,111,237,0.30)",
            }}
          >
            Back to sign in
          </Link>
        </div>
      </header>

      <div className="relative flex-1 flex flex-col items-center justify-center py-12">
        <div className="w-full max-w-sm mx-auto px-6">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <Logo height={30} />
            </div>
            <h1
              className="font-heading font-bold text-2xl text-foreground"
              style={{ textWrap: "balance" }}
            >
              Reset your password
            </h1>
            <p className="mt-3 text-sm" style={{ color: "#68707A", lineHeight: "1.6" }}>
              We&apos;ll email you a secure link so you can choose a new password and get back
              to your practice.
            </p>
          </div>

          <div
            className="bg-card border border-border rounded-2xl p-7"
            style={{ boxShadow: "0 12px 36px rgba(18,20,23,0.08)" }}
          >
            {sentTo ? (
              <div className="text-center">
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
                <h2
                  className="font-heading font-bold text-xl text-foreground"
                  style={{ textWrap: "balance" }}
                >
                  Check your email
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  We sent a password reset link to {sentTo}. Open it on this device and
                  you&apos;ll be able to choose a new password.
                </p>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  If you don&apos;t see it soon, check spam or request another link.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={inputClassName}
                  />
                </div>

                {error ? (
                  <div className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                ) : null}

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
                  {pending ? "Sending reset link…" : "Send reset link →"}
                </button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Remembered it?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Return to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
