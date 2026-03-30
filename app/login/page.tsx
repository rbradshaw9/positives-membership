"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/today";
  const reason = searchParams.get("reason");

  async function handleMagicLink(formData: FormData) {
    const email = formData.get("email") as string;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      alert(error.message);
    } else {
      alert("Check your email for a sign-in link.");
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto px-6">
      <div className="mb-8 text-center">
        <span className="block font-heading font-bold text-2xl tracking-tight mb-1">
          Positives
        </span>
        <p className="text-muted-foreground text-sm">
          {reason === "subscription_inactive"
            ? "Your membership is inactive. Sign in to manage your account."
            : "Sign in to continue your practice."}
        </p>
      </div>

      <form action={handleMagicLink} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-sm border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition"
          />
        </div>
        <button
          type="submit"
          className="w-full px-4 py-3 rounded bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft"
        >
          Send sign-in link
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Not a member?{" "}
        <a href="/" className="text-primary hover:underline">
          Learn about Positives
        </a>
      </p>
    </div>
  );
}

/**
 * app/login/page.tsx
 * Magic link authentication — calm, centered, mobile-first.
 * Uses Supabase OTP email auth.
 */
export default function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
