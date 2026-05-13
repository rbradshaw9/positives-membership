"use client";

import { useId, useRef, useState } from "react";

declare global {
  interface Window {
    _show_thank_you?: (
      id: string,
      message: string,
      trackcmpUrl?: string,
      email?: string,
    ) => void;
    _show_error?: (id: string, message: string, html?: string) => void;
  }
}

const ACTIVE_CAMPAIGN_FORM_ID = "6";
const ACTIVE_CAMPAIGN_ENDPOINT = "https://positives.activehosted.com/proc.php";

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LaunchWaitlistForm() {
  const firstNameId = useId();
  const emailId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = formRef.current;
    if (!form) {
      return;
    }

    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();

    setError(null);
    setSuccess(null);

    if (!isValidEmail(email)) {
      setError("Enter a valid email address to join the launch list.");
      return;
    }

    setIsSubmitting(true);

    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      params.append(key, String(value).trim());
    });
    params.set("jsonp", "true");

    window._show_thank_you = (id, message) => {
      if (id !== ACTIVE_CAMPAIGN_FORM_ID) {
        return;
      }

      setIsSubmitting(false);
      setSuccess(
        stripHtml(message) ||
          "You are on the launch list. We will send the next update soon.",
      );
    };

    window._show_error = (id, message) => {
      if (id !== ACTIVE_CAMPAIGN_FORM_ID) {
        return;
      }

      setIsSubmitting(false);
      setError(
        stripHtml(message) ||
          "Sorry, your submission did not go through. Please try again.",
      );
    };

    const script = document.createElement("script");
    script.src = `${ACTIVE_CAMPAIGN_ENDPOINT}?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      setIsSubmitting(false);
      setError("Sorry, your submission did not go through. Please try again.");
      script.remove();
    };
    script.onload = () => {
      script.remove();
    };

    document.head.appendChild(script);
  }

  if (success) {
    return (
      <div
        className="rounded-[8px] border px-5 py-6 sm:px-6"
        style={{
          background: "#F0FAF7",
          borderColor: "rgba(46,196,182,0.35)",
          color: "#224940",
        }}
        role="status"
      >
        <p className="font-heading text-xl font-bold" style={{ textWrap: "balance" }}>
          You are on the list.
        </p>
        <p className="mt-3 text-sm leading-7">
          We will let you know as soon as Positives opens and send a few simple
          updates as we get closer.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      method="POST"
      action={ACTIVE_CAMPAIGN_ENDPOINT}
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="u" value="6" />
      <input type="hidden" name="f" value="6" />
      <input type="hidden" name="s" value="" />
      <input type="hidden" name="c" value="0" />
      <input type="hidden" name="m" value="0" />
      <input type="hidden" name="act" value="sub" />
      <input type="hidden" name="v" value="2" />
      <input
        type="hidden"
        name="or"
        value="3ea57bde-c7a9-4c32-adc6-9ef8fb75fb76"
      />

      <div>
        <label
          htmlFor={firstNameId}
          className="mb-2 block text-sm font-semibold"
          style={{ color: "#3F4852" }}
        >
          First name
        </label>
        <input
          id={firstNameId}
          name="firstname"
          type="text"
          autoComplete="given-name"
          placeholder="Your first name"
          className="w-full rounded-[8px] border px-4 py-3 text-base outline-none transition focus:ring-4"
          style={{
            background: "#FFFFFF",
            borderColor: "#DDD7CF",
            color: "#121417",
            boxShadow: "0 1px 0 rgba(18,20,23,0.03)",
          }}
        />
      </div>

      <div>
        <label
          htmlFor={emailId}
          className="mb-2 block text-sm font-semibold"
          style={{ color: "#3F4852" }}
        >
          Email address
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${emailId}-error` : undefined}
          className="w-full rounded-[8px] border px-4 py-3 text-base outline-none transition focus:ring-4"
          style={{
            background: "#FFFFFF",
            borderColor: error ? "#D65A4A" : "#DDD7CF",
            color: "#121417",
            boxShadow: "0 1px 0 rgba(18,20,23,0.03)",
          }}
        />
        {error ? (
          <p id={`${emailId}-error`} className="mt-2 text-sm" style={{ color: "#B84336" }}>
            {error}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-65"
        style={{
          background: "#2F6FED",
          color: "#FFFFFF",
          boxShadow: "0 10px 24px rgba(47,111,237,0.24)",
        }}
      >
        {isSubmitting ? "Joining..." : "Join the launch waitlist"}
      </button>

      <p className="text-center text-xs leading-6" style={{ color: "#68707A" }}>
        No spam. Just launch updates and early details from Positives.
      </p>
    </form>
  );
}
