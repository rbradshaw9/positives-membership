"use client";

import { useCallback, useRef, useState } from "react";
import * as UpChunk from "@mux/upchunk";

/**
 * components/admin/VideoUploadPanel.tsx
 *
 * Self-contained video management panel for the admin content edit page.
 *
 * States:
 *   idle       → shows Upload button (or Replace / Remove if Mux video exists)
 *   uploading  → drag-drop zone + progress bar
 *   processing → spinner while Mux encodes
 *   ready      → success, shows new playback ID (page will reload)
 *   error      → error message with retry
 *
 * Workflow:
 *   1. User selects/drops a file
 *   2. POST /api/admin/video/upload  → get Mux upload URL
 *   3. UpChunk streams file to Mux
 *   4. Poll /api/admin/video/status until asset.status === "ready"
 *   5. POST /api/admin/video/commit  → swap DB fields, delete old asset
 *   6. Reload page to reflect new state
 */

type Props = {
  contentId: string;
  currentMuxPlaybackId: string | null;
  currentVimeoId: string | null;
  contentTitle: string;
  contentType: string;
};

type Phase =
  | "idle"
  | "confirming_replace"
  | "confirming_remove"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export function VideoUploadPanel({
  contentId,
  currentMuxPlaybackId,
  currentVimeoId,
  contentTitle,
  contentType,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasMux = !!currentMuxPlaybackId;
  const hasVimeo = !!currentVimeoId;
  const hasVideo = hasMux || hasVimeo;

  // ── Upload flow ─────────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    if (!file.type.startsWith("video/")) {
      setErrorMsg("Please select a video file.");
      setPhase("error");
      return;
    }

    setPhase("uploading");
    setProgress(0);
    setErrorMsg(null);

    try {
      // Step 1: get Mux upload URL
      const uploadRes = await fetch("/api/admin/video/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      });

      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create upload URL");
      }

      const { uploadUrl, uploadId } = await uploadRes.json();

      // Step 2: stream file to Mux via UpChunk
      await new Promise<void>((resolve, reject) => {
        const upload = UpChunk.createUpload({
          endpoint: uploadUrl,
          file,
          chunkSize: 5120, // 5 MB chunks
        });

        upload.on("progress", (e: { detail: number }) => {
          setProgress(Math.round(e.detail));
        });

        upload.on("success", () => resolve());
        upload.on("error", (e: { detail: string }) => reject(new Error(e.detail)));
      });

      // Step 3: poll until asset is ready
      setPhase("processing");
      await pollUntilReady(uploadId, contentId);

    } catch (err) {
      console.error("[VideoUploadPanel] Upload error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    }
  }

  async function pollUntilReady(uploadId: string, contentId: string) {
    const MAX_ATTEMPTS = 60; // 5 min max
    const INTERVAL_MS  = 5000;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await sleep(INTERVAL_MS);

      const res = await fetch(`/api/admin/video/status?uploadId=${uploadId}`);
      const data = await res.json();

      if (data.status === "errored") {
        throw new Error("Mux processing failed");
      }

      if (data.status === "ready" && data.playbackId) {
        // Step 4: commit to DB
        const commitRes = await fetch("/api/admin/video/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentId,
            assetId:    data.assetId,
            playbackId: data.playbackId,
          }),
        });

        if (!commitRes.ok) {
          throw new Error("Failed to save video to database");
        }

        setPhase("done");
        // Reload page after short delay so the new state is reflected
        setTimeout(() => window.location.reload(), 1200);
        return;
      }
    }

    throw new Error("Processing timed out. Check Mux dashboard.");
  }

  // ── Remove flow ─────────────────────────────────────────────────────────────

  async function handleRemove() {
    setPhase("uploading"); // reuse loading state
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/video/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Remove failed");
      }

      setPhase("done");
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Remove failed");
      setPhase("error");
    }
  }

  // ── Drag-and-drop handlers ───────────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const typeLabel: Record<string, string> = {
    monthly_theme:    "Monthly",
    weekly_principle: "Weekly",
    coaching_call:    "Coaching",
    workshop:         "Workshop",
    library:          "Library",
  };
  const typePrefix = typeLabel[contentType] ?? contentType;

  return (
    <div className="border-t border-border pt-4 flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Video
        </p>
        {hasMux && phase === "idle" && (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <span aria-hidden="true">✓</span> Mux
          </span>
        )}
        {hasVimeo && !hasMux && phase === "idle" && (
          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <span aria-hidden="true">⚠</span> Vimeo — migrate to Mux
          </span>
        )}
      </div>

      {/* ── Idle: status + action buttons ─────────────────────────────────── */}
      {phase === "idle" && (
        <div className="flex flex-col gap-3">
          {/* Current video info */}
          {hasMux && (
            <div className="bg-muted/40 border border-border rounded-lg p-3 flex flex-col gap-0.5">
              <p className="text-xs text-muted-foreground">Playback ID</p>
              <p className="text-xs font-mono text-foreground break-all">
                {currentMuxPlaybackId}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Mux dashboard: <strong>{typePrefix} | {contentTitle}</strong>
              </p>
            </div>
          )}
          {hasVimeo && !hasMux && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                Vimeo ID: <span className="font-mono">{currentVimeoId}</span>
                <br />
                <span className="text-amber-600">Upload a video below to migrate to Mux.</span>
              </p>
            </div>
          )}
          {!hasVideo && (
            <p className="text-sm text-muted-foreground">
              No video attached. Upload one below.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Upload / Replace */}
            <button
              type="button"
              onClick={() => {
                if (hasMux) {
                  setPhase("confirming_replace");
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="px-3 py-2 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-hover transition-colors"
            >
              {hasMux ? "Replace video" : hasVimeo ? "Upload to Mux" : "Upload video"}
            </button>

            {/* Remove (Mux only — Vimeo ID is managed in the Content form) */}
            {hasMux && (
              <button
                type="button"
                onClick={() => setPhase("confirming_remove")}
                className="px-3 py-2 rounded border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors"
              >
                Remove video
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* ── Confirm replace ────────────────────────────────────────────────── */}
      {phase === "confirming_replace" && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex flex-col gap-3">
          <p className="text-sm text-amber-800 font-medium">
            Replace video?
          </p>
          <p className="text-xs text-amber-700">
            The current video will keep playing until the new one is processed
            and ready. Then the database will swap automatically.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors"
            >
              Choose replacement file
            </button>
            <button
              type="button"
              onClick={() => setPhase("idle")}
              className="px-3 py-2 rounded border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* ── Confirm remove ─────────────────────────────────────────────────── */}
      {phase === "confirming_remove" && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex flex-col gap-3">
          <p className="text-sm text-destructive font-medium">
            Remove video?
          </p>
          <p className="text-xs text-destructive/80">
            This will permanently delete the Mux asset and remove it from this
            content record. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-2 rounded bg-destructive text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Yes, remove video
            </button>
            <button
              type="button"
              onClick={() => setPhase("idle")}
              className="px-3 py-2 rounded border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Uploading: drag-drop zone + progress ───────────────────────────── */}
      {phase === "uploading" && (
        <div className="flex flex-col gap-3">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2
              transition-colors duration-200
              ${isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/20"
              }
            `}
          >
            <svg
              width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.5"
              className="text-muted-foreground"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm text-muted-foreground">
              {progress > 0 ? `Uploading… ${progress}%` : "Uploading…"}
            </p>
          </div>

          {/* Progress bar */}
          {progress > 0 && (
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Processing: Mux encoding ───────────────────────────────────────── */}
      {phase === "processing" && (
        <div className="flex items-center gap-3 p-4 bg-muted/30 border border-border rounded-lg">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Processing…</p>
            <p className="text-xs text-muted-foreground">
              Mux is encoding your video. This usually takes 1–3 minutes.
            </p>
          </div>
        </div>
      )}

      {/* ── Done ──────────────────────────────────────────────────────────── */}
      {phase === "done" && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <span className="text-emerald-600 text-lg" aria-hidden="true">✓</span>
          <div>
            <p className="text-sm font-medium text-emerald-700">Video ready</p>
            <p className="text-xs text-emerald-600">Refreshing…</p>
          </div>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {phase === "error" && (
        <div className="flex flex-col gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive font-medium">
            {errorMsg ?? "Something went wrong"}
          </p>
          <button
            type="button"
            onClick={() => setPhase("idle")}
            className="self-start text-xs text-destructive underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Mux tag: <span className="font-mono">{typePrefix} | {contentTitle}</span>
      </p>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
