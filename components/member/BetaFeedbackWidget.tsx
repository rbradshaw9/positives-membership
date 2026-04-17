"use client";

import { useActionState, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { submitBetaFeedback } from "@/app/(member)/feedback/actions";
import {
  BETA_FEEDBACK_CATEGORY_OPTIONS,
  BETA_FEEDBACK_SEVERITY_OPTIONS,
} from "@/lib/beta-feedback/shared";

type Props = {
  memberEmail: string | null;
  memberName: string | null;
};

type FeedbackActionState = {
  success?: string;
  error?: string;
};

const INITIAL_STATE: FeedbackActionState = {};

function getBrowserContext() {
  if (typeof window === "undefined") {
    return {
      pageUrl: "",
      browserName: "",
      osName: "",
      deviceType: "desktop",
      viewportWidth: "",
      viewportHeight: "",
      timezone: "",
      userAgent: "",
    };
  }

  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform || "";
  const width = window.innerWidth;
  const browserName =
    userAgent.includes("Edg/") ? "Edge" :
    userAgent.includes("Chrome/") ? "Chrome" :
    userAgent.includes("Firefox/") ? "Firefox" :
    userAgent.includes("Safari/") && !userAgent.includes("Chrome/") ? "Safari" :
    "Other";
  const osName =
    /iPhone|iPad|iPod/.test(userAgent) ? "iOS" :
    /Android/.test(userAgent) ? "Android" :
    platform.includes("Mac") ? "macOS" :
    platform.includes("Win") ? "Windows" :
    platform.includes("Linux") ? "Linux" :
    "Other";
  const deviceType = width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop";

  return {
    pageUrl: window.location.href,
    browserName,
    osName,
    deviceType,
    viewportWidth: String(width),
    viewportHeight: String(window.innerHeight),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    userAgent,
  };
}

export function BetaFeedbackWidget({ memberEmail, memberName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, pending] = useActionState(submitBetaFeedback, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [browserContext, setBrowserContext] = useState(getBrowserContext);

  useEffect(() => {
    const onResize = () => setBrowserContext(getBrowserContext());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    return () => {
      setIsOpen(false);
    };
  }, []);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  const memberLabel = useMemo(() => {
    if (memberName) return memberName;
    if (memberEmail) return memberEmail;
    return "there";
  }, [memberEmail, memberName]);

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setIsOpen((open) => {
            if (!open) {
              setBrowserContext(getBrowserContext());
            }
            return !open;
          })
        }
        className="fixed bottom-28 right-4 z-40 rounded-full border border-sky-200/80 bg-white/96 px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur md:bottom-8"
      >
        Share beta feedback
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/18 p-3 md:items-end md:p-6">
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,250,255,0.96))] shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
            <div className="border-b border-slate-200/80 px-5 py-4 md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-600">
                    Beta feedback
                  </p>
                  <h2 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.03em] text-slate-950">
                    Tell us what slowed you down
                  </h2>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                    We&apos;ll capture the page, device, and release details automatically so the team can move faster.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600"
                >
                  Close
                </button>
              </div>
            </div>

            <form
              ref={formRef}
              action={formAction}
              className="max-h-[85dvh] overflow-y-auto px-5 py-5 md:px-6"
            >
              <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                Sending this as <span className="font-semibold">{memberLabel}</span>.
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-800">Category</span>
                  <select
                    name="category"
                    required
                    defaultValue="bug"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                  >
                    {BETA_FEEDBACK_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-800">Urgency</span>
                  <select
                    name="severity"
                    required
                    defaultValue="medium"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                  >
                    {BETA_FEEDBACK_SEVERITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 grid gap-2">
                <span className="text-sm font-semibold text-slate-800">Quick summary</span>
                <input
                  name="summary"
                  required
                  minLength={8}
                  placeholder="Example: The billing page refreshed and lost my place"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
                />
              </label>

              <label className="mt-4 grid gap-2">
                <span className="text-sm font-semibold text-slate-800">What happened?</span>
                <textarea
                  name="details"
                  required
                  minLength={16}
                  rows={5}
                  placeholder="Walk us through what you clicked, what you saw, and anything that felt confusing."
                  className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400"
                />
              </label>

              <label className="mt-4 grid gap-2">
                <span className="text-sm font-semibold text-slate-800">What did you expect instead?</span>
                <textarea
                  name="expectedBehavior"
                  rows={3}
                  placeholder="Optional, but really helpful."
                  className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400"
                />
              </label>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-800">Screenshot</span>
                  <input
                    type="file"
                    name="screenshot"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-800">Loom link</span>
                  <input
                    type="url"
                    name="loomUrl"
                    placeholder="https://www.loom.com/..."
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
                  />
                </label>
              </div>

              <input type="hidden" name="pageUrl" value={browserContext.pageUrl} />
              <input type="hidden" name="browserName" value={browserContext.browserName} />
              <input type="hidden" name="osName" value={browserContext.osName} />
              <input type="hidden" name="deviceType" value={browserContext.deviceType} />
              <input type="hidden" name="viewportWidth" value={browserContext.viewportWidth} />
              <input type="hidden" name="viewportHeight" value={browserContext.viewportHeight} />
              <input type="hidden" name="timezone" value={browserContext.timezone} />
              <input type="hidden" name="userAgent" value={browserContext.userAgent} />

              {state.error ? (
                <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {state.error}
                </p>
              ) : null}

              {state.success ? (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {state.success}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-5">
                <p className="max-w-md text-xs leading-5 text-slate-500">
                  We automatically attach your page, device, and release context so you don&apos;t have to document all the technical details manually.
                </p>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(46,196,182,0.28)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pending ? "Sending..." : "Send feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
