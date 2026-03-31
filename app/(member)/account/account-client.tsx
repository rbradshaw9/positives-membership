"use client";

import { useActionState } from "react";
import { setPassword } from "./actions";
import { useFormStatus } from "react-dom";

type State = { error?: string; success?: true };
const initial: State = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      id="account-set-password-submit"
      className="w-full inline-flex items-center justify-center font-semibold rounded-full transition-opacity"
      style={{
        background: pending
          ? "rgba(47,111,237,0.55)"
          : "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
        color: "#FFFFFF",
        boxShadow: pending ? "none" : "0 6px 20px rgba(47,111,237,0.25)",
        letterSpacing: "-0.01em",
        fontSize: "0.925rem",
        padding: "0.85rem 1.5rem",
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.75 : 1,
      }}
    >
      {pending ? "Saving…" : "Set password"}
    </button>
  );
}

export function AccountClient() {
  const [state, action] = useActionState<State, FormData>(setPassword, initial);

  if (state.success) {
    return (
      <div
        className="rounded-3xl p-8 text-center"
        style={{
          background: "#FFFFFF",
          border: "1.5px solid rgba(78,140,120,0.20)",
          boxShadow: "0 8px 32px rgba(18,20,23,0.06)",
        }}
      >
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-6"
          style={{ background: "rgba(78,140,120,0.12)" }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4E8C78"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p
          className="font-heading font-bold mb-2"
          style={{ fontSize: "1.25rem", letterSpacing: "-0.03em", color: "#121417" }}
        >
          Password set.
        </p>
        <p className="text-sm" style={{ color: "#68707A", lineHeight: "1.65" }}>
          You can now sign in with your email and password anytime.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="account-password"
          className="block text-sm font-medium mb-2"
          style={{ color: "#4A5360", letterSpacing: "-0.01em" }}
        >
          New password
        </label>
        <input
          id="account-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="At least 8 characters"
          className="w-full rounded-2xl text-sm outline-none transition-shadow"
          style={{
            background: "#FFFFFF",
            border: "1.5px solid rgba(221,215,207,0.85)",
            color: "#121417",
            padding: "0.8rem 1rem",
            letterSpacing: "-0.01em",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(47,111,237,0.45)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,111,237,0.08)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(221,215,207,0.85)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      <div>
        <label
          htmlFor="account-confirm"
          className="block text-sm font-medium mb-2"
          style={{ color: "#4A5360", letterSpacing: "-0.01em" }}
        >
          Confirm password
        </label>
        <input
          id="account-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="Re-enter your password"
          className="w-full rounded-2xl text-sm outline-none transition-shadow"
          style={{
            background: "#FFFFFF",
            border: "1.5px solid rgba(221,215,207,0.85)",
            color: "#121417",
            padding: "0.8rem 1rem",
            letterSpacing: "-0.01em",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(47,111,237,0.45)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,111,237,0.08)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(221,215,207,0.85)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="text-sm rounded-xl px-4 py-3"
          style={{
            background: "rgba(220,40,40,0.06)",
            border: "1px solid rgba(220,40,40,0.12)",
            color: "#B03030",
          }}
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
