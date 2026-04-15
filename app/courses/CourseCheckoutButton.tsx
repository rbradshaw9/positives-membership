"use client";

import { useState, useTransition } from "react";
import { getCourseCheckoutUrl } from "./actions";

type CourseCheckoutButtonProps = {
  courseId: string;
  disabled?: boolean;
  owned?: boolean;
  signedIn?: boolean;
  priceLabel?: string;
};

export function CourseCheckoutButton({
  courseId,
  disabled = false,
  owned = false,
  signedIn = false,
  priceLabel,
}: CourseCheckoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function startCheckout() {
    setError(null);
    setMessage(null);

    if (signedIn && !confirming) {
      setConfirming(true);
      return;
    }

    const formData = new FormData();
    formData.set("courseId", courseId);

    startTransition(async () => {
      const result = await getCourseCheckoutUrl(formData);
      if (result.status === "error") {
        setError(result.error ?? "Could not start checkout. Please try again.");
        return;
      }

      if (result.status === "purchased" || result.status === "owned") {
        setMessage(result.message);
      }

      window.location.href = result.url;
    });
  }

  return (
    <div>
      {confirming && signedIn && !owned && (
        <div
          style={{
            border: "1px solid rgba(18, 20, 23, 0.1)",
            borderRadius: "1rem",
            padding: "0.85rem",
            marginBottom: "0.75rem",
            background: "rgba(46, 196, 182, 0.08)",
          }}
        >
          <p style={{ margin: 0, color: "#3F4652", fontSize: "0.86rem", lineHeight: 1.55 }}>
            We&apos;ll try your saved card for {priceLabel ?? "this one-time purchase"}. If
            it needs an update, we&apos;ll send you to Stripe Checkout instead.
          </p>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            style={{
              marginTop: "0.5rem",
              border: 0,
              padding: 0,
              background: "transparent",
              color: "#68707A",
              fontSize: "0.8rem",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={startCheckout}
        disabled={disabled || owned || isPending}
        className="btn-primary"
        style={{
          width: "100%",
          justifyContent: "center",
          opacity: disabled || owned ? 0.65 : 1,
        }}
      >
        {owned
          ? "In your library"
          : isPending
            ? signedIn
              ? "Adding to library..."
              : "Opening checkout..."
            : confirming
              ? "Confirm and add to library"
              : "Add to my library"}
      </button>
      {message && (
        <p style={{ marginTop: "0.6rem", fontSize: "0.82rem", color: "#146C5F" }}>
          {message}
        </p>
      )}
      {error && (
        <p style={{ marginTop: "0.6rem", fontSize: "0.82rem", color: "#b42318" }}>
          {error}
        </p>
      )}
    </div>
  );
}
