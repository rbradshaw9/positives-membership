"use client";

import { useActionState, useTransition } from "react";
import { updateMarketingPreference } from "./actions";

type State = { error?: string; success?: true };

const initial: State = {};

export function EmailPreferencesForm({
  email,
  subscribedToMarketing,
}: {
  email: string;
  subscribedToMarketing: boolean;
}) {
  const [state, action] = useActionState<State, FormData>(updateMarketingPreference, initial);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={action}
      className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4"
      style={{ boxShadow: "var(--shadow-medium)" }}
    >
      <div>
        <p className="text-sm font-medium text-foreground">
          Practice emails and member updates
        </p>
        <p className="mt-1 text-sm leading-body text-muted-foreground">
          Marketing and nurture emails go to <span className="font-medium text-foreground">{email}</span>.
          Receipts, billing notices, password resets, and other account messages still arrive even
          if you turn these off.
        </p>
      </div>

      <input type="hidden" name="subscribe" value={subscribedToMarketing ? "false" : "true"} />

      <div
        className="rounded-2xl border px-4 py-4"
        style={{
          borderColor: subscribedToMarketing ? "rgba(78,140,120,0.18)" : "rgba(18,20,23,0.08)",
          background: subscribedToMarketing ? "rgba(78,140,120,0.05)" : "rgba(18,20,23,0.02)",
        }}
      >
        <p className="text-sm font-medium text-foreground">
          {subscribedToMarketing ? "Currently on" : "Currently off"}
        </p>
        <p className="mt-1 text-sm leading-body text-muted-foreground">
          {subscribedToMarketing
            ? "You are opted in to practice emails, onboarding nudges, and other optional Positives updates."
            : "You are opted out of optional Positives marketing emails. You can turn them back on anytime here."}
        </p>
      </div>

      {state.error ? <p role="alert" className="text-xs text-destructive">{state.error}</p> : null}
      {state.success ? (
        <p className="text-xs text-secondary font-medium">
          Email preferences saved.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        onClick={() => startTransition(() => {})}
        className={subscribedToMarketing ? "btn-outline self-start" : "btn-primary self-start"}
        style={{ padding: "0.5rem 1.125rem", fontSize: "0.8125rem" }}
      >
        {isPending
          ? "Saving…"
          : subscribedToMarketing
            ? "Turn off marketing emails"
            : "Turn on marketing emails"}
      </button>
    </form>
  );
}
