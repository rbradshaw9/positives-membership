"use client";

/**
 * components/today/StreakBadge.tsx
 *
 * Client component that renders the 🔥 streak badge on /today.
 *
 * Initialized with the server-rendered streak count (SSR-safe).
 * Subscribes to the "positives:streak-updated" custom window event dispatched
 * by MemberAudioProvider after markListened resolves — so the badge animates
 * instantly when the member completes today's audio, no page reload required.
 */

import { useEffect, useState } from "react";

interface StreakBadgeProps {
  /** Server-rendered streak count — shown immediately without flash. */
  initialStreak: number;
}

export function StreakBadge({ initialStreak }: StreakBadgeProps) {
  const [streak, setStreak] = useState(initialStreak);
  const [justUpdated, setJustUpdated] = useState(false);

  useEffect(() => {
    function handleStreakUpdated(e: Event) {
      const { newStreak } = (e as CustomEvent<{ newStreak: number }>).detail;
      if (typeof newStreak === "number" && newStreak !== streak) {
        setStreak(newStreak);
        setJustUpdated(true);
        // Remove the "just updated" glow after 3 s
        setTimeout(() => setJustUpdated(false), 3000);
      }
    }

    window.addEventListener("positives:streak-updated", handleStreakUpdated);
    return () => window.removeEventListener("positives:streak-updated", handleStreakUpdated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = streak > 0;

  return (
    <span
      className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold mt-1"
      style={{
        background: isActive
          ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
          : "var(--color-muted)",
        color: isActive ? "var(--color-accent)" : "var(--color-muted-fg)",
        border: isActive
          ? "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)"
          : "1px solid var(--color-border)",
        // Pulse glow when streak just incremented
        boxShadow: justUpdated
          ? "0 0 0 3px color-mix(in srgb, var(--color-accent) 20%, transparent), 0 0 12px color-mix(in srgb, var(--color-accent) 25%, transparent)"
          : "none",
        transition: "box-shadow 0.4s ease, color 0.3s ease, background 0.3s ease",
      }}
      aria-live="polite"
      aria-label={isActive ? `${streak}-day streak` : "Start your streak"}
    >
      🔥 {isActive ? `${streak}-day streak` : "Start your streak"}
    </span>
  );
}
