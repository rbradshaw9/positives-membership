"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type State =
  | "idle"
  | "accepting"
  | "downgrading"
  | "canceling"
  | "canceled"
  | "changed"
  | "error";

export function CancelClient({ isPlus }: { isPlus: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [showRetentionStep, setShowRetentionStep] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [periodEndLabel, setPeriodEndLabel] = useState<string | null>(null);
  const [changeLabel, setChangeLabel] = useState<string | null>(null);
  const [winbackCode, setWinbackCode] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
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

  async function handleDowngrade(includeFreeMonth: boolean) {
    setState("downgrading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/stripe/downgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer: includeFreeMonth ? "free_month" : "standard" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setChangeLabel(data.effectiveLabel ?? null);
      setState("changed");
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
      setWinbackCode(data.winbackCode ?? null);
      setEmailSent(typeof data.emailSent === "boolean" ? data.emailSent : null);
      setState("canceled");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      setState("error");
    }
  }

  const busy = ["accepting", "downgrading", "canceling"].includes(state);

  if (state === "changed") {
    return (
      <div className="rounded-2xl border border-secondary/15 bg-secondary/5 p-5">
        <p className="text-sm font-semibold text-foreground">Plan change scheduled</p>
        <p className="mt-2 text-sm leading-body text-muted-foreground">
          {changeLabel
            ? <>You keep Plus through <span className="font-medium text-foreground">{changeLabel}</span>. Then your membership moves to Positives automatically.</>
            : "Your downgrade has been scheduled. It will appear on your account shortly."}
        </p>
        <Link href="/account?plan_change=downgrade" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to account
        </Link>
      </div>
    );
  }

  if (state === "canceled") {
    return (
      <div className="rounded-2xl border border-border bg-surface-tint/40 p-5">
        <p className="text-sm font-semibold text-foreground">Membership canceled</p>
        <p className="mt-2 text-sm leading-body text-muted-foreground">
          {periodEndLabel
            ? <>Your access continues until <span className="font-medium text-foreground">{periodEndLabel}</span>.</>
            : "Your membership has been canceled. Access continues until the end of your billing period."}
        </p>
        {winbackCode ? (
          <p className="mt-2 text-sm leading-body text-muted-foreground">
            We also sent you a come-back code:{" "}
            <span className="font-semibold text-foreground">{winbackCode}</span>
            {emailSent === false ? " The email could not be sent, but the code is here for you." : "."}
          </p>
        ) : null}
        <Link href="/account" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {errorMsg ? (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {errorMsg}
        </p>
      ) : null}

      {!showRetentionStep ? (
        <div className="rounded-2xl border border-secondary/15 bg-secondary/5 p-5">
          <p className="ui-section-eyebrow mb-2 text-secondary">Sorry to see you go</p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {isPlus ? "Would the lower plan be a better fit?" : "Before you cancel"}
          </h2>
          <p className="mt-2 text-sm leading-body text-muted-foreground">
            {isPlus
              ? "Instead of canceling, you can move to Positives, our lower plan. You keep the daily practice and member library, and Plus stays active through the period you already paid for."
              : "You are already on Positives, our lower plan. If you still want to stop renewal, you can continue to the final cancellation step."}
          </p>
          <div className="mt-5 flex flex-col gap-3">
            {isPlus ? (
              <button
                type="button"
                onClick={() => handleDowngrade(false)}
                disabled={busy}
                className="btn-primary w-full justify-center px-5 py-3 text-sm disabled:opacity-60"
              >
                {state === "downgrading" ? "Scheduling..." : "Downgrade to Positives"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setShowRetentionStep(true);
              }}
              disabled={busy}
              className="btn-outline w-full justify-center px-5 py-3 text-sm disabled:opacity-60"
            >
              {isPlus ? "No, continue to cancel" : "Continue to cancellation"}
            </button>
          </div>
        </div>
      ) : isPlus ? (
        <>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="ui-section-eyebrow mb-2">Are you sure?</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Keep your access with a softer landing
            </h2>
            <p className="mt-2 text-sm leading-body text-muted-foreground">
              If price is the reason, you can take 50% off your next Plus invoice or move to
              Positives with one month free. If neither feels right, you can still cancel below.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleAcceptOffer}
                disabled={busy}
                className="btn-primary justify-center px-5 py-3 text-sm disabled:opacity-60"
              >
                {state === "accepting" ? "Applying..." : "Take 50% off Plus"}
              </button>
              <button
                type="button"
                onClick={() => handleDowngrade(true)}
                disabled={busy}
                className="btn-outline justify-center px-5 py-3 text-sm disabled:opacity-60"
              >
                {state === "downgrading" ? "Applying..." : "Positives + free month"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-secondary/15 bg-secondary/5 p-5">
          <p className="ui-section-eyebrow mb-2 text-secondary">Are you sure?</p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Keep access with one month free
          </h2>
          <p className="mt-2 text-sm leading-body text-muted-foreground">
            Your next month is free, then your membership continues at the regular rate. You can
            still cancel any time.
          </p>
          <button
            type="button"
            onClick={handleAcceptOffer}
            disabled={busy}
            className="btn-primary mt-5 w-full justify-center px-5 py-3 text-sm disabled:opacity-60"
          >
            {state === "accepting" ? "Applying..." : "Redeem one free month"}
          </button>
        </div>
      )}

      {showRetentionStep ? (
        <div className="border-t border-border pt-5">
          <p className="text-sm leading-body text-muted-foreground">
            Ready to stop renewal completely? Your access continues through the current paid period.
            We will also email you a discount code in case you want to return later.
          </p>

          {showConfirm ? (
            <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-foreground">Are you sure?</p>
              <p className="mt-1 text-sm leading-body text-muted-foreground">
                This will cancel your membership immediately. Your access continues through
                the end of your current billing period.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={busy}
                  className="w-full rounded-full border border-destructive/25 px-5 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                >
                  {state === "canceling" ? "Canceling..." : "Yes, cancel my membership"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={busy}
                  className="w-full rounded-full px-5 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  Never mind
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={busy}
              className="mt-3 w-full rounded-full border border-destructive/25 px-5 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-60"
            >
              No, cancel my membership
            </button>
          )}

          {!showConfirm && (
            <button
              type="button"
              onClick={() => setShowRetentionStep(false)}
              disabled={busy}
              className="mt-3 w-full rounded-full px-5 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              Back
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
