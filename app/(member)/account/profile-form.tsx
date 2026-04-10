"use client";

import { useActionState, useTransition } from "react";
import { updateProfile } from "./actions";

type State = { error?: string; success?: true };
const initial: State = {};

interface ProfileFormProps {
  currentName: string;
  email: string;
}

export function ProfileForm({ currentName, email }: ProfileFormProps) {
  const [state, action] = useActionState<State, FormData>(updateProfile, initial);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={action}
      className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4"
      style={{ boxShadow: "var(--shadow-medium)" }}
    >
      <div>
        <label
          htmlFor="account-name"
          className="block text-sm font-medium mb-2 text-muted-foreground"
        >
          Your name
        </label>
        <input
          id="account-name"
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={currentName}
          required
          maxLength={80}
          placeholder="Your full name"
          className="member-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-muted-foreground">
          Sign-in email
        </label>
        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {email}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          This is your current sign-in email. Email changes can be added separately if needed.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="text-xs text-secondary font-medium">Profile saved.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        onClick={() => startTransition(() => {})}
        className="btn-primary self-start"
        style={{ padding: "0.5rem 1.125rem", fontSize: "0.8125rem" }}
      >
        {isPending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
