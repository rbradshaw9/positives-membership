"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { saveMemberTourState } from "@/app/(member)/onboarding/actions";
import {
  MEMBER_ONBOARDING_TOUR_STEPS,
  type MemberTourStatus,
} from "@/lib/onboarding/member-tour";

type MemberOnboardingTourProps = {
  initialStatus: MemberTourStatus | null;
  shouldAutoStart: boolean;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const TOUR_EVENT_NAME = "positives:start-member-tour";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function findTourTarget(target: string) {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour-target="${target}"]`)
  );

  return (
    candidates.find((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    }) ?? null
  );
}

export function MemberOnboardingTour({
  initialStatus,
  shouldAutoStart,
}: MemberOnboardingTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const autoStartedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const steps = MEMBER_ONBOARDING_TOUR_STEPS;
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const totalSteps = steps.length;

  const cardPosition = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    if (!targetRect || targetMissing) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cardWidth = Math.min(380, viewportWidth - 32);
    const estimatedCardHeight = 300;
    const belowTop = targetRect.top + targetRect.height + 18;
    const aboveTop = targetRect.top - estimatedCardHeight - 18;
    const top =
      belowTop + estimatedCardHeight < viewportHeight
        ? belowTop
        : Math.max(16, aboveTop);
    const left = clamp(
      targetRect.left + targetRect.width / 2 - cardWidth / 2,
      16,
      viewportWidth - cardWidth - 16
    );

    return {
      top: `${top}px`,
      left: `${left}px`,
      transform: "none",
      width: `${cardWidth}px`,
    };
  }, [targetMissing, targetRect]);

  const persistState = useCallback((status: MemberTourStatus, lastStep: string | null) => {
    void saveMemberTourState({ status, lastStep });
  }, []);

  const startTour = useCallback(
    (source: "auto" | "manual") => {
      setStepIndex(0);
      setActive(true);
      persistState("started", steps[0]?.id ?? null);
      if (source === "manual") {
        router.push(steps[0]?.path ?? "/today");
      }
    },
    [persistState, router, steps]
  );

  const closeTour = useCallback(
    (status: "dismissed" | "completed") => {
      persistState(status, step?.id ?? null);
      setActive(false);
      setTargetRect(null);
      setTargetMissing(false);
    },
    [persistState, step?.id]
  );

  const goToStep = useCallback(
    (nextIndex: number) => {
      const nextStep = steps[nextIndex];
      if (!nextStep) return;
      setStepIndex(nextIndex);
      persistState("started", nextStep.id);
      if (pathname !== nextStep.path) {
        router.push(nextStep.path);
      }
    },
    [pathname, persistState, router, steps]
  );

  useEffect(() => {
    function handleStartTour() {
      startTour("manual");
    }

    window.addEventListener(TOUR_EVENT_NAME, handleStartTour);
    return () => window.removeEventListener(TOUR_EVENT_NAME, handleStartTour);
  }, [startTour]);

  useEffect(() => {
    if (!shouldAutoStart || autoStartedRef.current) return;
    if (initialStatus === "dismissed" || initialStatus === "completed") return;

    autoStartedRef.current = true;
    const timer = window.setTimeout(() => startTour("auto"), 800);
    return () => window.clearTimeout(timer);
  }, [initialStatus, shouldAutoStart, startTour]);

  useEffect(() => {
    if (!active || !step || pathname === step.path) return;
    router.push(step.path);
  }, [active, pathname, router, step]);

  useEffect(() => {
    if (!active || !step) return;
    if (pathname !== step.path) return;

    let frame = 0;
    let cancelled = false;

    function measure(options: { scrollIntoView?: boolean } = {}) {
      const element = findTourTarget(step.target);
      if (!element) {
        setTargetRect(null);
        setTargetMissing(true);
        return;
      }

      if (options.scrollIntoView) {
        element.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "center",
          inline: "nearest",
        });
      }

      frame = window.requestAnimationFrame(() => {
        if (cancelled) return;
        const rect = element.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
        setTargetMissing(false);
      });
    }

    const measureCurrentTarget = () => measure();

    const timer = window.setTimeout(() => measure({ scrollIntoView: true }), 180);
    window.addEventListener("resize", measureCurrentTarget);
    window.addEventListener("scroll", measureCurrentTarget, true);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measureCurrentTarget);
      window.removeEventListener("scroll", measureCurrentTarget, true);
    };
  }, [active, pathname, step]);

  useEffect(() => {
    if (!active) return;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeTour("dismissed");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, closeTour, stepIndex]);

  if (!active || !step) return null;

  const cutout =
    targetRect && !targetMissing
      ? {
          top: Math.max(0, targetRect.top - 10),
          left: Math.max(0, targetRect.left - 10),
          width: targetRect.width + 20,
          height: targetRect.height + 20,
        }
      : null;

  return (
    <div aria-live="polite">
      {cutout ? (
        <>
          <div className="fixed inset-x-0 top-0 z-[90] bg-black/58" style={{ height: cutout.top }} />
          <div
            className="fixed left-0 z-[90] bg-black/58"
            style={{ top: cutout.top, width: cutout.left, height: cutout.height }}
          />
          <div
            className="fixed right-0 z-[90] bg-black/58"
            style={{
              top: cutout.top,
              left: cutout.left + cutout.width,
              height: cutout.height,
            }}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-[90] bg-black/58"
            style={{ top: cutout.top + cutout.height }}
          />
          <div
            className="pointer-events-none fixed z-[95] rounded-[1.4rem] border-2 border-primary shadow-[0_0_0_6px_rgba(46,196,182,0.18),0_22px_80px_rgba(0,0,0,0.25)]"
            style={cutout}
          />
        </>
      ) : (
        <div className="fixed inset-0 z-[90] bg-black/58" />
      )}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-tour-title"
        tabIndex={-1}
        className="fixed z-[100] w-[calc(100vw-2rem)] max-w-[23.75rem] rounded-[1.35rem] border border-white/14 bg-[#111215] p-5 text-white shadow-large outline-none md:p-6"
        style={cardPosition}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary">
              {step.eyebrow}
            </p>
            <h2
              id="member-tour-title"
              className="mt-2 font-heading text-xl font-bold leading-heading tracking-[-0.02em] text-white"
            >
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => closeTour("dismissed")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/70 transition-colors hover:bg-white/12 hover:text-white"
            aria-label="Close tour"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-white/72">{step.body}</p>
        {targetMissing ? (
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/7 px-3 py-2 text-xs leading-5 text-white/58">
            This area may be hidden for your current account, but the guidance still applies.
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-white/45">
            Step {stepIndex + 1} of {totalSteps}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => closeTour("dismissed")}
              className="rounded-full px-3 py-2 text-xs font-semibold text-white/58 transition-colors hover:bg-white/8 hover:text-white"
            >
              Skip for now
            </button>
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => goToStep(stepIndex - 1)}
                className="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-xs font-semibold text-white/82 transition-colors hover:bg-white/10"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (isLastStep) {
                  closeTour("completed");
                } else {
                  goToStep(stepIndex + 1);
                }
              }}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-primary-hover"
            >
              {isLastStep ? "Finish" : step.actionLabel ?? "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function startMemberOnboardingTour() {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT_NAME));
}
