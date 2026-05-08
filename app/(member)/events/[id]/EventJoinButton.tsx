"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

const JOIN_WINDOW_MS = 60 * 60 * 1000;

type EventJoinButtonProps = {
  joinUrl: string | null;
  startsAt: string;
  endsAt: string;
  initialNowMs: number;
};

export function EventJoinButton({
  joinUrl,
  startsAt,
  endsAt,
  initialNowMs,
}: EventJoinButtonProps) {
  const [nowMs, setNowMs] = useState(initialNowMs);
  const startsAtMs = useMemo(() => new Date(startsAt).getTime(), [startsAt]);
  const endsAtMs = useMemo(() => new Date(endsAt).getTime(), [endsAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!joinUrl || nowMs > endsAtMs) return null;

  const canJoin = nowMs >= startsAtMs - JOIN_WINDOW_MS;
  if (canJoin) {
    return (
      <Button href={joinUrl} target="_blank" rel="noopener noreferrer" className="w-full justify-center">
        Join Event
      </Button>
    );
  }

  return (
    <>
      <Button type="button" variant="outline" disabled className="w-full justify-center">
        Join Event
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Join opens one hour before the event.
      </p>
    </>
  );
}
