"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bookingId: string;
  currentStatus: string;
};

const STATUS_OPTIONS = [
  { value: "completed", label: "Mark Completed", color: "text-green-700" },
  { value: "noshow", label: "Mark No-Show", color: "text-amber-700" },
  { value: "canceled", label: "Cancel", color: "text-red-600" },
] as const;

export function AdminBookingActions({ bookingId, currentStatus }: Props) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(status: string) {
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/coaching/booking/${bookingId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed");
        setUpdating(false);
        return;
      }
      setDone(true);
      // Refresh without full page reload
      router.refresh();
    } catch {
      setError("Failed");
      setUpdating(false);
    }
  }

  if (currentStatus !== "confirmed") {
    return <span className="text-xs text-muted-foreground capitalize">{currentStatus}</span>;
  }

  if (done) {
    return <span className="text-xs text-green-600">Updated ✓</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleUpdate(opt.value)}
          disabled={updating}
          className={`text-xs font-medium ${opt.color} hover:underline disabled:opacity-50 text-left`}
        >
          {opt.label}
        </button>
      ))}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
