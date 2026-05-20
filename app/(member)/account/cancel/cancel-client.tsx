"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type State = "idle" | "accepting" | "canceling" | "canceled" | "error";

export function CancelClient() {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [periodEndLabel, setPeriodEndLabel] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleAcceptOffer() {
    setState("accepting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/stripe/retention-coupon", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      router.push("/account?retention=accepted");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      setState("error");
    }
  }

  async function handleCancel() {
    setState("canceling");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/stripe/cancel-subscription", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setPeriodEndLabel(data.periodEndLabel ?? null);
      setState("canceled");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      setState("error");
    }
  }

  if (state === "canceled") {
    return (
      <div className="rounded-xl border border-border bg-surface-tint/40 p-5 text-center">
        <p className="text-sm font-semibold text-foreground">Membership canceled</p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {periodEndLabel
            ? <>Your access continues until <span className="font-medium text-foreground">{periodEndLabel}</span>. We hope to see you again.</>
            : "Your membership has been canceled. Access continues until the end of your billing period."}
        </p>
        <Link
          href="/account"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Back to account
        </Link>
      </div>
    );
  }

  return (
    <>
      {errorMsg && (
        <p className="px-1 text-sm text-destructive">{errorMsg}</p>
      )}
      <button
        type="button"
        onClick={handleAcceptOffer}
        disabled={state === "accepting" || state === "canceling"}
        className="w-full py-3.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
          boxShadow: "0 6px 24px rgba(47,111,237,0.25)",
        }}
      >
        {state === "accepting" ? "Redeeming…" : "Redeem discount"}
      </button>
      <button
        type="button"
        onClick={handleCancel}
        disabled={state === "accepting" || state === "canceling"}
        className="w-full py-3 rounded-full text-sm font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-60"
      >
        {state === "canceling" ? "Canceling…" : "Cancel subscription"}
      </button>
    </>
  );
}
