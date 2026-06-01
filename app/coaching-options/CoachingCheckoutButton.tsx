"use client";

import { useState, useTransition } from "react";
import {
  getCoachingCheckoutUrl,
  type CoachingCheckoutResult,
} from "./actions";

type CoachingCheckoutButtonProps = {
  packType: "single" | "punch_pass";
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "dark";
  className?: string;
};

function ArrowIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

const VARIANT_CLASSES = {
  primary:
    "text-white shadow-[0_12px_30px_rgba(46,196,182,0.22)] hover:opacity-92 focus-visible:ring-[rgba(46,196,182,0.22)]",
  secondary:
    "border border-[rgba(18,20,23,0.14)] bg-white text-[#121417] hover:border-[rgba(46,196,182,0.38)] focus-visible:ring-[rgba(46,196,182,0.18)]",
  dark:
    "border border-[rgba(18,20,23,0.14)] bg-white text-[#121417] hover:border-[rgba(46,196,182,0.38)] focus-visible:ring-[rgba(46,196,182,0.18)]",
} as const;

export function CoachingCheckoutButton({
  packType,
  children,
  variant = "primary",
  className = "",
}: CoachingCheckoutButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPrimary = variant === "primary";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result: CoachingCheckoutResult = await getCoachingCheckoutUrl(formData);

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      setError(result.error ?? "Could not start checkout. Please try again.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <input type="hidden" name="packType" value={packType} />
      <input type="hidden" name="sourcePath" value="/coaching-options" />
      <button
        type="submit"
        disabled={isPending}
        className={[
          "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-wait disabled:opacity-70 sm:w-auto",
          VARIANT_CLASSES[variant],
        ].join(" ")}
        style={
          isPrimary
            ? {
                background: "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
              }
            : undefined
        }
      >
        {isPending ? "Opening checkout..." : children}
        {!isPending ? <ArrowIcon /> : null}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-center text-xs text-[#C0392B] sm:text-left">
          {error}
        </p>
      ) : null}
    </form>
  );
}
