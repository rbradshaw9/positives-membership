"use client";

import { useState, useTransition } from "react";
import { getCourseCheckoutUrl } from "./actions";

type CourseCheckoutButtonProps = {
  courseId: string;
  disabled?: boolean;
  owned?: boolean;
};

export function CourseCheckoutButton({
  courseId,
  disabled = false,
  owned = false,
}: CourseCheckoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startCheckout() {
    setError(null);
    const formData = new FormData();
    formData.set("courseId", courseId);

    startTransition(async () => {
      const result = await getCourseCheckoutUrl(formData);
      if (!result.url) {
        setError(result.error ?? "Could not start checkout. Please try again.");
        return;
      }

      window.location.href = result.url;
    });
  }

  return (
    <div>
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
        {owned ? "In your library" : isPending ? "Opening checkout..." : "Add to my library"}
      </button>
      {error && (
        <p style={{ marginTop: "0.6rem", fontSize: "0.82rem", color: "#b42318" }}>
          {error}
        </p>
      )}
    </div>
  );
}
