"use client";

import { useMemo, useSyncExternalStore } from "react";

type Props = {
  memberName?: string | null;
};

const STORAGE_KEY = "positives-beta-welcome-dismissed";
const STORAGE_EVENT = "positives:beta-welcome-storage";

function subscribeToDismissal(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
  };
}

function getDismissalSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerDismissalSnapshot() {
  return false;
}

export function BetaWelcomeBanner({ memberName }: Props) {
  const dismissed = useSyncExternalStore(
    subscribeToDismissal,
    getDismissalSnapshot,
    getServerDismissalSnapshot,
  );

  const greeting = useMemo(() => {
    if (!memberName) return "You’re in the Positives beta.";
    const firstName = memberName.split(" ")[0]?.trim();
    return firstName ? `${firstName}, you’re in the Positives beta.` : "You’re in the Positives beta.";
  }, [memberName]);

  function hideBanner() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }

  function openFeedback() {
    window.dispatchEvent(new CustomEvent("positives:open-beta-feedback"));
  }

  if (dismissed) return null;

  return (
    <section className="mx-auto mb-3 w-full max-w-6xl px-4 pt-3 md:mb-4 md:px-6 md:pt-4">
      <div className="overflow-hidden rounded-2xl border border-sky-200/70 bg-[linear-gradient(135deg,rgba(46,196,182,0.1),rgba(61,182,231,0.08),rgba(255,255,255,0.98))] shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 px-4 py-3.5 md:gap-4 md:px-5 md:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-teal-600">
              Beta
            </p>
            <h2 className="mt-1 font-heading text-lg font-semibold tracking-[-0.035em] text-slate-950 md:text-2xl">
              {greeting}
            </h2>
            <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-slate-650 sm:block">
              Use the app normally and send quick feedback when something feels broken, confusing,
              slow, incomplete, or thin.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 md:gap-3">
            <button
              type="button"
              onClick={openFeedback}
              className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(46,196,182,0.2)] md:px-4 md:py-2.5"
            >
              Send feedback
            </button>
            <button
              type="button"
              onClick={hideBanner}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 md:px-4 md:py-2.5"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
