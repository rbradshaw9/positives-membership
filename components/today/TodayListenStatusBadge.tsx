"use client";

import { useEffect, useState } from "react";

interface TodayListenStatusBadgeProps {
  initialHasListened: boolean;
  contentId: string | null;
}

export function TodayListenStatusBadge({
  initialHasListened,
  contentId,
}: TodayListenStatusBadgeProps) {
  const [hasListened, setHasListened] = useState(initialHasListened);

  useEffect(() => {
    setHasListened(initialHasListened);
  }, [initialHasListened]);

  useEffect(() => {
    function handleTodayListened(event: Event) {
      const detail = (event as CustomEvent<{ contentId?: string | null }>).detail;
      if (!contentId || !detail?.contentId || detail.contentId !== contentId) return;
      setHasListened(true);
    }

    window.addEventListener("positives:today-listened", handleTodayListened);
    return () => window.removeEventListener("positives:today-listened", handleTodayListened);
  }, [contentId]);

  return (
    <span
      className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
      style={{
        background: hasListened
          ? "rgba(22,163,74,0.12)"
          : "rgba(255,255,255,0.8)",
        color: hasListened ? "#15803D" : "#52525B",
        border: hasListened
          ? "1px solid rgba(22,163,74,0.22)"
          : "1px solid var(--color-border)",
      }}
      aria-live="polite"
      aria-label={hasListened ? "Today's audio completed" : "Today's audio not completed yet"}
    >
      {hasListened ? "✓ Today's audio complete" : "○ Today's audio not completed yet"}
    </span>
  );
}
