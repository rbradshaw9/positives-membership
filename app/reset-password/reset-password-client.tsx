"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Logo } from "@/components/marketing/Logo";
import { completePasswordRecovery } from "./actions";

type State = { error?: string; success?: true };
const initial: State = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
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
      {pending ? "Saving new password…" : "Save new password →"}
    </button>
  );
}

export function ResetPasswordClient({ email }: { email: string }) {
  const [state, action] = useActionState<State, FormData>(completePasswordRecovery, initial);

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
            href="/today"
            className="text-sm font-semibold px-5 py-2.5 rounded-full"
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              boxShadow: "0 4px 14px rgba(47,111,237,0.30)",
            }}
          >
            Open Positives
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
              Choose your new password
            </h1>
            <p className="mt-3 text-sm" style={{ color: "#68707A", lineHeight: "1.6" }}>
              You&apos;re resetting access for {email}. Once this is saved, you can sign in
              with your email and password anytime.
            </p>
          </div>

          <div
            className="bg-card border border-border rounded-2xl p-7"
            style={{ boxShadow: "0 12px 36px rgba(18,20,23,0.08)" }}
          >
            {state.success ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-5 bg-secondary/10">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4E8C78"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2
                  className="font-heading font-bold text-xl text-foreground"
                  style={{ textWrap: "balance" }}
                >
                  Password updated
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Your account is secure again. You can head back into Today or return to sign
                  in later with your new password.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link
                    href="/today"
                    className="w-full px-6 py-3.5 rounded-full text-white font-medium text-sm transition-all"
                    style={{
                      background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                      boxShadow: "0 6px 24px rgba(47,111,237,0.25)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Return to Today
                  </Link>
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                    Back to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <form action={action} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-password"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    New password
                  </label>
                  <input
                    id="reset-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className="member-input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Confirm password
                  </label>
                  <input
                    id="reset-confirm"
                    name="confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    className="member-input"
                  />
                </div>

                {state.error ? (
                  <div className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                    {state.error}
                  </div>
                ) : null}

                <SubmitButton />
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
