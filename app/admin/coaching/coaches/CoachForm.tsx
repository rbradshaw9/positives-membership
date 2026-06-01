"use client";

/**
 * app/admin/coaching/coaches/CoachForm.tsx
 *
 * Shared form for creating and editing coach profiles.
 * Used by both /admin/coaching/coaches/new and /admin/coaching/coaches/[id]
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ZoomConnectionOption } from "@/lib/events/types";

export type CoachFormData = {
  id?: string;
  display_name: string;
  title: string;
  bio: string;
  avatar_url: string;
  member_id: string;
  routing_group: string;
  is_active: boolean;
  accepts_new: boolean;
  session_duration_minutes: number;
  buffer_minutes_after: number;
  zoom_connection_id: string;
};

const ROUTING_GROUPS = ["general", "premium", "specialty", "oncall"];

export function CoachForm({
  initial,
  zoomConnections = [],
}: {
  initial?: Partial<CoachFormData>;
  zoomConnections?: ZoomConnectionOption[];
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<CoachFormData>({
    id: initial?.id,
    display_name: initial?.display_name ?? "",
    title: initial?.title ?? "",
    bio: initial?.bio ?? "",
    avatar_url: initial?.avatar_url ?? "",
    member_id: initial?.member_id ?? "",
    routing_group: initial?.routing_group ?? "general",
    is_active: initial?.is_active ?? false,
    accepts_new: initial?.accepts_new ?? true,
    session_duration_minutes: initial?.session_duration_minutes ?? 60,
    buffer_minutes_after: initial?.buffer_minutes_after ?? 15,
    zoom_connection_id: initial?.zoom_connection_id ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof CoachFormData>(key: K, value: CoachFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.display_name.trim()) {
      setError("Display name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coaching/coaches", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          display_name: form.display_name.trim(),
          title: form.title.trim() || null,
          bio: form.bio.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
          member_id: form.member_id.trim() || null,
          zoom_connection_id: form.zoom_connection_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Save failed");
        setSaving(false);
        return;
      }
      router.push("/admin/coaching");
      router.refresh();
    } catch {
      setError("Save failed. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">

      {/* Basic info */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
          Basic Information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5" htmlFor="cf-display-name">
              Display name <span className="text-destructive">*</span>
            </label>
            <input
              id="cf-display-name"
              type="text"
              required
              value={form.display_name}
              onChange={(e) => update("display_name", e.target.value)}
              placeholder="Dr. Jane Smith"
              className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5" htmlFor="cf-title">
              Title / credentials
            </label>
            <input
              id="cf-title"
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Certified Life Coach, PhD"
              className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5" htmlFor="cf-bio">
            Bio <span className="text-muted-foreground/60">(shown to members at booking)</span>
          </label>
          <textarea
            id="cf-bio"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            rows={4}
            placeholder="A short paragraph about this coach's background, specialty, and approach…"
            className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5" htmlFor="cf-avatar">
            Avatar URL
          </label>
          <input
            id="cf-avatar"
            type="url"
            value={form.avatar_url}
            onChange={(e) => update("avatar_url", e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5" htmlFor="cf-member-id">
            Linked member ID <span className="text-muted-foreground/60">(for coach portal access)</span>
          </label>
          <input
            id="cf-member-id"
            type="text"
            value={form.member_id}
            onChange={(e) => update("member_id", e.target.value)}
            placeholder="uuid…"
            className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </section>

      {/* Zoom */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
          Zoom
        </h2>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5" htmlFor="cf-zoom-connection">
            Default Zoom account
          </label>
          <select
            id="cf-zoom-connection"
            value={form.zoom_connection_id}
            onChange={(e) => update("zoom_connection_id", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Use platform fallback</option>
            {zoomConnections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.owner_kind === "coach" ? "Coach" : "Platform"} - {connection.label}
                {connection.zoom_user_email ? ` (${connection.zoom_user_email})` : ""}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            New bookings for this coach use this account first. If it is empty, Positives uses the newest active platform Zoom account.
          </p>
        </div>
      </section>

      {/* Scheduling */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
          Scheduling
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5" htmlFor="cf-duration">
              Session duration (min)
            </label>
            <input
              id="cf-duration"
              type="number"
              min="15"
              max="240"
              step="5"
              value={form.session_duration_minutes}
              onChange={(e) => update("session_duration_minutes", parseInt(e.target.value, 10))}
              className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5" htmlFor="cf-buffer">
              Buffer after (min)
            </label>
            <input
              id="cf-buffer"
              type="number"
              min="0"
              max="60"
              step="5"
              value={form.buffer_minutes_after}
              onChange={(e) => update("buffer_minutes_after", parseInt(e.target.value, 10))}
              className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5" htmlFor="cf-routing">
              Routing group
            </label>
            <select
              id="cf-routing"
              value={form.routing_group}
              onChange={(e) => update("routing_group", e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ROUTING_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Status flags */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
          Status
        </h2>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => update("is_active", e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground">Active (visible to members for booking)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.accepts_new}
            onChange={(e) => update("accepts_new", e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground">Accepts new members (uncheck for existing clients only)</span>
        </label>
      </section>

      {error && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="admin-btn admin-btn--primary"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create coach"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/coaching")}
          className="admin-btn admin-btn--outline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
