"use client";

import { useMemo, useState } from "react";

type Props = {
  memberName?: string | null;
};

const STORAGE_KEY = "positives-beta-welcome-dismissed";

export function BetaWelcomeBanner({ memberName }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const greeting = useMemo(() => {
    if (!memberName) return "You’re in the Positives beta.";
    const firstName = memberName.split(" ")[0]?.trim();
    return firstName ? `${firstName}, you’re in the Positives beta.` : "You’re in the Positives beta.";
  }, [memberName]);

  function hideBanner() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setDismissed(true);
  }

  function openFeedback() {
    window.dispatchEvent(new CustomEvent("positives:open-beta-feedback"));
  }

  if (dismissed) return null;

  return (
    <section className="mx-auto mb-6 w-full max-w-6xl px-4 pt-4 md:px-6">
      <div className="overflow-hidden rounded-[30px] border border-sky-200/70 bg-[linear-gradient(135deg,rgba(46,196,182,0.12),rgba(61,182,231,0.1),rgba(255,255,255,0.98))] shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 px-5 py-5 md:px-7 md:py-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-600">
              Beta Welcome
            </p>
            <h2 className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-slate-950">
              {greeting}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-650">
              We want real usage, honest friction, and fast feedback. The goal isn’t to be perfect yet. The goal is to help us see what feels smooth, what feels confusing, and what deserves immediate attention before a broader launch.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[34rem]">
            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                What to try
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <li>Use Today and My Practice</li>
                <li>Open the Library and a course</li>
                <li>Touch account and billing flows</li>
              </ul>
            </div>

            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                What helps us most
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <li>Anything broken</li>
                <li>Anything confusing or awkward</li>
                <li>Anything slow, incomplete, or thin</li>
              </ul>
            </div>

            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Report issues
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Use the <span className="font-semibold">Share beta feedback</span> button in the app. Add a screenshot or Loom link if you can.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/70 bg-white/55 px-5 py-4 md:px-7">
          <p className="text-xs leading-6 text-slate-600">
            Beta expectation: we may fix quickly, ask follow-up questions, or leave a known issue in place while we gather signal.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openFeedback}
              className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(46,196,182,0.25)]"
            >
              Send feedback
            </button>
            <button
              type="button"
              onClick={hideBanner}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
