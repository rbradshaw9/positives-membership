"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/marketing/Logo";

export default function UpgradeConfirmPage() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleConfirm() {
    setState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/stripe/upgrade-subscription", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      router.push("/account?upgraded=true");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      setState("error");
    }
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#F6F3EE" }}>
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
            href="/account"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to account
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-sm">
          <div
            className="bg-card border border-border rounded-2xl p-8"
            style={{ boxShadow: "0 12px 36px rgba(18,20,23,0.08)" }}
          >
            <div className="text-center mb-6">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ background: "#EEF2FF" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
              </span>
              <h1
                className="font-heading font-bold text-xl text-foreground"
                style={{ letterSpacing: "-0.02em" }}
              >
                Upgrade to Positives Plus
              </h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Your upgrade applies immediately. Stripe will charge the prorated difference today, then bill you at the new rate on your next renewal.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface-tint/30 p-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">From</span>
                <span className="font-medium text-foreground">Positives</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">To</span>
                <span className="font-semibold text-foreground">Positives Plus</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Effective</span>
                <span className="font-medium text-foreground">Immediately</span>
              </div>
            </div>

            {errorMsg && (
              <p className="mb-4 text-sm text-destructive text-center">{errorMsg}</p>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={state === "loading"}
                className="w-full py-3.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  boxShadow: "0 6px 24px rgba(47,111,237,0.25)",
                }}
              >
                {state === "loading" ? "Upgrading…" : "Confirm upgrade"}
              </button>
              <Link
                href="/account"
                className="w-full text-center py-3 rounded-full text-sm font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors"
              >
                Not now
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer
        className="w-full py-6 text-center"
        style={{ borderTop: "1px solid rgba(221,215,207,0.5)" }}
      >
        <div className="flex items-center justify-center gap-4 text-xs" style={{ color: "#9AA0A8" }}>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
