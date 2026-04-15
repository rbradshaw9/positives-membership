"use client";

import { useActionState, useTransition } from "react";
import { updateProfile } from "./actions";

type State = { error?: string; success?: true };
const initial: State = {};

interface ProfileFormProps {
  currentName: string;
  email: string;
  avatarUrl?: string | null;
}

export function ProfileForm({ currentName, email, avatarUrl }: ProfileFormProps) {
  const [state, action] = useActionState<State, FormData>(updateProfile, initial);
  const [isPending, startTransition] = useTransition();
  const displayName = currentName.trim() || "Member";
  const initials = displayName
    .replace(/\s*\(.*?\)\s*/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <form
      action={action}
      className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4"
        style={{ boxShadow: "var(--shadow-medium)" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.6rem] border border-border bg-muted text-xl font-bold text-muted-foreground"
          style={
            avatarUrl
              ? {
                  backgroundImage: `url(${avatarUrl})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }
              : undefined
          }
          aria-hidden="true"
        >
          {avatarUrl ? null : initials || "P"}
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor="account-avatar"
            className="block text-sm font-medium mb-2 text-muted-foreground"
          >
            Profile photo
          </label>
          <input
            id="account-avatar"
            name="avatarFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="member-input file:mr-3 file:rounded-full file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-background"
          />
          <p className="mt-2 text-xs leading-body text-muted-foreground">
            Optional. JPEG, PNG, WebP, or GIF up to 3 MB.
          </p>
        </div>
      </div>

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
