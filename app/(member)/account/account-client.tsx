"use client";

import { useActionState } from "react";
import { setPassword } from "./actions";
import { useFormStatus } from "react-dom";

/**
 * app/(member)/account/account-client.tsx
 * Sprint 7: client component for setting a password.
 * Sprint 11: replaced inline onFocus/onBlur handlers with .member-input CSS
 *   class. Replaced inline style button with .btn-primary class.
 *   Preserved all logic — only styling approach changed.
 */

type State = { error?: string; success?: true };
const initial: State = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      id="account-set-password-submit"
      className="btn-primary w-full"
    >
      {pending ? "Saving…" : "Set password"}
    </button>
  );
}

export function AccountClient() {
  const [state, action] = useActionState<State, FormData>(setPassword, initial);

  if (state.success) {
    return (
      <div className="rounded-2xl p-8 text-center bg-secondary/5 border border-secondary/15">
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
        <p className="font-heading font-bold text-xl tracking-[-0.025em] text-foreground mb-1.5">
          Password set.
        </p>
        <p className="text-sm text-muted-foreground leading-body">
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
          className="block text-sm font-medium mb-2 text-muted-foreground"
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
          className="member-input"
        />
      </div>

      <div>
        <label
          htmlFor="account-confirm"
          className="block text-sm font-medium mb-2 text-muted-foreground"
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
          className="member-input"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="text-sm rounded-xl px-4 py-3 bg-destructive/6 border border-destructive/12 text-destructive"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
