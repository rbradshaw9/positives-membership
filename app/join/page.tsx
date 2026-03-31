import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JoinClient } from "./join-client";

export const metadata = {
  title: "Join Positives — A Daily Practice for Calm & Resilience",
  description:
    "Start your Positives membership for $49/month. Daily grounding audio, weekly principles, and monthly themes guided by Dr. Paul Jenkins.",
};

/**
 * app/join/page.tsx
 * Public conversion + auth page.
 *
 * Server component that detects auth state, then delegates to JoinClient
 * which renders the appropriate UI:
 *
 *   unauthenticated     → pricing + email/password signup form
 *   authenticated, active   → redirect to /today (already a member)
 *   authenticated, inactive → pricing + one-click checkout (no auth form)
 *
 * step=check-email    → confirmation holding screen
 */
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; email?: string; error?: string }>;
}) {
  const { step, email: emailParam, error: errorParam } = await searchParams;

  // ── Auth-aware redirect for active members ───────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: member } = await supabase
      .from("member")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    if (member?.subscription_status === "active") {
      // Already a member — nothing to buy
      redirect("/today");
    }
  }

  // ── Check-email holding screen ───────────────────────────────────────────
  if (step === "check-email") {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center">
          <div
            className="bg-card border border-border rounded-2xl p-8 mb-6"
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
              We sent a sign-in link to{" "}
              <span className="text-foreground font-medium">
                {emailParam ?? "your email"}
              </span>
              . Click it to complete your account and start checkout.
            </p>
          </div>
          <a
            href="/join"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to join
          </a>
        </div>
      </div>
    );
  }

  // ── Main join page ───────────────────────────────────────────────────────
  return (
    <JoinClient
      isAuthenticated={!!user}
      userEmail={user?.email ?? null}
      initialError={errorParam ?? null}
    />
  );
}
